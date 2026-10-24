// Snowboarding: the Icicle Inn -> Great Glacier ride (two forks decide where Cloud ends up on the
// glacier) and the Gold Saucer arcade courses A / B / C (opts.mode === 'arcade' | 'gold_saucer', opts.course).
//   Left/Right steer, ✕ jump, ↓ or □ brake, L1/R1 edge (sharper turns).
//   Balloons: red 1 pt, blue 3, green 5.  Arcade score (FF7): Time 30 + Technique 30 + Balloons 40;
//   -1 Time point per 2 s over par, -1 Technique point per bump/crash.  BAD / AWFUL / GOOD (70+) / COOL (100).
//   Story result { won: true, score: balloon points, time (s), balloons, route: 'LR', area: 1|3|5|9 }
//   Arcade result { won: score >= 70, score, time, balloons, balloonPts, technique, timePts, rank, course }
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const G = 0.012;                 // gravity (m/frame^2)
  const BAL = { red: { pts: 1, col: '#e82830' }, blue: { pts: 3, col: '#2860e8' }, green: { pts: 5, col: '#20c040' } };
  // Great Glacier areas reached by each route (Guide_and_Walkthrough: L+R = 1, L+L = 3, R+R = 5, R+L = 9)
  const AREA = { LR: 1, LL: 3, RR: 5, RL: 9 };
  const PAR = { A: 63, B: 74, C: 85 };   // seconds for the full 30 Time points (FF7's 1'30 / 1'45 / 2'00, condensed)

  // ------------------------------------------------------------------ meshes
  let MESH = null;
  function meshes() {
    if (MESH) return MESH;
    MESH = {};
    MESH.balloon = {};
    for (const k in BAL) MESH.balloon[k] = MG.mesh(mb => { mb.sphere(0, 0, 0, 0.45, 0.55, 0.45, BAL[k].col, 10, 7, true); mb.prism(0, -0.62, 0, 0.08, 0.02, 0.1, 5, U.shade(BAL[k].col, -0.3)); mb.box(0, -1.1, 0, 0.02, 0.9, 0.02, '#f0f0f0'); });
    MESH.rock = MG.mesh(mb => { mb.sphere(0, 0.25, 0, 0.8, 0.7, 0.75, '#6a6e78', 7, 5, false); mb.sphere(0.35, 0.55, 0.1, 0.4, 0.3, 0.4, '#f0f4fa', 6, 4, true); });
    MESH.bigrock = MG.mesh(mb => { mb.sphere(0, 0.6, 0, 1.3, 1.5, 1.2, '#585c66', 7, 5, false); mb.sphere(0.2, 1.7, 0, 0.9, 0.35, 0.8, '#f0f4fa', 6, 4, true); });
    MESH.tree = MG.mesh(mb => { mb.prism(0, 0, 0, 0.18, 0.14, 0.8, 6, '#5a3a24'); [[0.6, 1.6, 1.3], [1.5, 1.25, 1.2], [2.3, 0.9, 1.1], [3.0, 0.55, 0.9]].forEach(([y, r, h]) => { mb.prism(0, y, 0, r, 0, h, 7, '#2a5a3a'); mb.prism(0, y + h * 0.55, 0, r * 0.5, 0, h * 0.45, 7, '#e8f0f8'); }); });
    MESH.penguin = MG.mesh(mb => { mb.sphere(0, 0.4, 0, 0.26, 0.4, 0.24, '#1c1c28', 8, 6, true); mb.sphere(0, 0.36, 0.1, 0.18, 0.3, 0.16, '#f4f4f4', 8, 6, true); mb.sphere(0, 0.86, 0.02, 0.17, 0.17, 0.17, '#1c1c28', 8, 6, true); mb.spike([0, 0.86, 0.15], [0, -0.2, 1], 0.14, 0.05, 4, '#f0a020'); [1, -1].forEach(s => mb.box(s * 0.24, 0.45, 0, 0.06, 0.4, 0.15, '#1c1c28')); mb.box(0.08, 0.02, 0.1, 0.1, 0.04, 0.16, '#f0a020'); mb.box(-0.08, 0.02, 0.1, 0.1, 0.04, 0.16, '#f0a020'); });
    MESH.snowball = MG.mesh(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#f4f8ff', 10, 7, true));
    MESH.igloo = MG.mesh(mb => { mb.sphere(0, 0, 0, 1.8, 1.5, 1.8, '#e8f0fa', 10, 6, true, null, 3); mb.frustum(0, 0, 1.5, 0.9, 1.2, 0.8, 1.2, 1.0, '#d8e4f4'); mb.box(0, 0.45, 2.1, 0.55, 0.8, 0.05, '#203040'); });
    MESH.crystal = MG.mesh(mb => { mb.spike([0, 0, 0], [0, 1, 0], 2.2, 0.45, 5, '#80d8ff'); mb.spike([0.3, 0, 0.1], [0.4, 1, 0], 1.4, 0.3, 5, '#a0e8ff'); mb.spike([-0.3, 0, -0.1], [-0.4, 1, 0.2], 1.2, 0.28, 5, '#60c0f0'); }, { unlit: false });
    MESH.stalactite = MG.mesh(mb => { mb.spike([0, 0, 0], [0, -1, 0], 2.4, 0.4, 5, '#8a3a2a'); });
    MESH.ramp = MG.mesh(mb => { mb.frustum(0, 0, 0, 1, 2.2, 1, 0.2, 0.7, { top: '#f4f8ff', side: '#d8e4f4', front: '#e0eaf8', back: '#c8d4e8' }, [0, 0.9]); });
    MESH.gate = MG.mesh(mb => { [-1, 1].forEach(s => { mb.box(s * 0.5, 1.6, 0, 0.16, 3.2, 0.16, '#d02020'); mb.box(s * 0.5, 3.1, 0, 0.9, 0.5, 0.05, s > 0 ? '#2040d0' : '#d02020'); }); });
    MESH.banner = MG.mesh(mb => { mb.box(0, 4.5, 0, 1, 1.1, 0.1, '#ffffff'); });
    MESH.flag = MG.mesh(mb => { mb.box(0, 1.1, 0, 0.06, 2.2, 0.06, '#e0e0e0'); mb.box(0.25, 1.95, 0, 0.5, 0.35, 0.03, '#e02020'); });
    MESH.divider = MG.mesh(mb => { mb.sphere(0, 0.6, 0, 1.6, 1.4, 3.5, '#5a5e68', 7, 5, false); mb.sphere(0, 1.6, 0, 1.1, 0.4, 2.6, '#f0f4fa', 6, 4, true); });
    MESH.sign = MG.mesh(mb => { mb.box(0, 0.9, 0, 0.12, 1.8, 0.12, '#6a4a2a'); mb.box(0, 1.8, 0, 1.6, 0.5, 0.08, '#8a6a3a'); });
    MESH.arrowL = MG.mesh(mb => { mb.tri([0.55, 1.8, 0.05], [-0.1, 2.0, 0.05], [-0.1, 1.6, 0.05], '#ffffff'); }, { unlit: true, cull: false });
    // background: snowy mountain ring + sky
    MESH.mountains = MG.mesh(mb => {
      const rnd = MG.rng('glacier-mountains');
      for (let i = 0; i < 40; i++) {
        const a = i / 40 * Math.PI * 2 + rnd() * 0.1, r = 330 + rnd() * 60, h = 60 + rnd() * 110, w = 70 + rnd() * 60;
        mb.push(); mb.translate(Math.sin(a) * r, -60, Math.cos(a) * r); mb.rotate(0, a, 0);
        mb.prism(0, 0, 0, w, 0, h, 5, U.mix('#7890b0', '#a0b4d0', rnd()));
        mb.prism(0, h * 0.62, 0, w * 0.38, 0, h * 0.38, 5, '#f4f8ff');
        mb.pop();
      }
    });
    return MESH;
  }

  // ------------------------------------------------------------------ course building
  function segsFor(rnd, total, st) {
    const out = [{ len: 50, turn: 0, dy: -50 * st.grade * 0.6, w: st.w }];
    let s = 50, side = rnd() < 0.5 ? 1 : -1;
    while (s < total) {
      const len = U.lerp(st.minLen, st.maxLen, rnd());
      const turn = side * U.lerp(st.maxTurn * 0.35, st.maxTurn, rnd());
      side = rnd() < st.flip ? -side : side;
      const g = st.grade * U.lerp(0.6, 1.4, rnd());
      out.push({ len, turn, dy: -len * g, w: st.w * U.lerp(0.85, 1.1, rnd()) });
      if (rnd() < 0.3) out.push({ len: len * 0.4, turn: 0, dy: -len * 0.4 * g, w: st.w });
      s += len;
    }
    return out;
  }
  // item: { s, u, type, h? (balloon height above surface), col?, move? }
  function balloonLine(items, s0, n, u0, u1, col, gap, h) { for (let i = 0; i < n; i++) items.push({ s: s0 + i * (gap || 7), u: U.lerp(u0, u1, n > 1 ? i / (n - 1) : 0), type: 'balloon', col, h: h || 1.3 }); }

  // Theme per leg: colours + obstacle set
  const THEMES = {
    snow: { snow: '#eef4fc', snow2: '#dce8f6', bank: '#f4f8ff', obst: ['rock', 'tree'] },
    rocks: { snow: '#eef4fc', snow2: '#dde6f2', bank: '#f0f4fa', obst: ['rock', 'rock', 'snowball'] },
    penguins: { snow: '#f0f6fe', snow2: '#e0eaf6', bank: '#f4f8ff', obst: ['penguin', 'penguin', 'tree'] },
    redcave: { snow: '#e8d8d4', snow2: '#d8c0b8', bank: '#9a4a36', obst: ['stalactite', 'stalactite', 'rock'], cave: '#7a3424', ceil: '#5a2418' },
    ice: { snow: '#cfe6f8', snow2: '#b8d8f0', bank: '#e8f2fc', obst: ['bigrock', 'snowball', 'rock'], ice: true },
    crystal: { snow: '#e0ecfa', snow2: '#ccdcf2', bank: '#6a88b0', obst: ['crystal', 'crystal', 'rock'], cave: '#4a6890', ceil: '#34507a' },
    moogles: { snow: '#f0f6fe', snow2: '#e0eaf6', bank: '#f4f8ff', obst: ['moogle', 'igloo', 'moogle'] },
    arcade: { snow: '#f0f6fe', snow2: '#dbe6f4', bank: '#f8fbff', obst: ['tree', 'rock', 'flag'] },
  };

  class Leg {
    constructor(def, start) {
      this.def = def; this.theme = THEMES[def.theme || 'snow'];
      this.path = new MG.Path(def.segs, Object.assign({ w: def.segs[0].w }, start));
      this.items = (def.items || []).filter(it => it.s < this.path.length - 5).sort((a, b) => a.s - b.s);
      this.next = def.next || null;       // [leftLeg, rightLeg] or null
      this.fork = !!(this.next && this.next.length === 2);
    }
    endPoint(off) { const p = this.path, a = p.at(p.length), q = p.pos(p.length, off || 0, 0); return { x: q[0], y: q[1], z: q[2], yaw: a.yaw }; }
    build() {
      if (this.mesh) return;
      const p = this.path, th = this.theme, L = p.length;
      const rnd = MG.rng(this.def.id || 'leg');
      this.mesh = MG.mesh(mb => {
        // snow surface with soft stripes
        p.strip(mb, 0, L, (s, w) => -w / 2, (s, w) => w / 2, (s, f, i) => (Math.floor(i / 6) + Math.floor(f * 4)) % 2 ? th.snow : th.snow2, { stride: 2, nu: 4 });
        // raised banks
        p.strip(mb, 0, L, (s, w) => -w / 2 - 5, (s, w) => -w / 2, th.bank, { stride: 3, nu: 2, bank: (s, f) => (1 - f) * (1 - f) * 3.2 });
        p.strip(mb, 0, L, (s, w) => w / 2, (s, w) => w / 2 + 5, th.bank, { stride: 3, nu: 2, bank: (s, f) => f * f * 3.2 });
        // outer snowfield
        p.strip(mb, 0, L, (s, w) => -w / 2 - 60, (s, w) => -w / 2 - 5, th.bank, { stride: 6, lift: 3.2 });
        p.strip(mb, 0, L, (s, w) => w / 2 + 5, (s, w) => w / 2 + 60, th.bank, { stride: 6, lift: 3.2 });
        if (th.cave) {
          p.wall(mb, 0, L, (s, w) => w / 2 + 2, 0, 8, (s, i) => (i >> 2) % 2 ? th.cave : U.shade(th.cave, -0.12), { stride: 2 });
          p.wall(mb, 0, L, (s, w) => -w / 2 - 2, 0, 8, (s, i) => (i >> 2) % 2 ? th.cave : U.shade(th.cave, -0.12), { stride: 2, facePlus: true });
          p.strip(mb, 0, L, (s, w) => -w / 2 - 2, (s, w) => w / 2 + 2, th.ceil, { stride: 2, lift: 8, flip: true });
        } else {
          // pine trees + rocks outside the banks
          for (let s = 8; s < L; s += 7 + rnd() * 9) {
            [-1, 1].forEach(sd => {
              if (rnd() < 0.35) return;
              const a = p.at(s), off = a.w / 2 + 6 + rnd() * 20;
              const q = p.pos(s, sd * off, 3.2);
              mb.push(); mb.translate(q[0], q[1], q[2]); mb.rotate(0, rnd() * 6, 0); const k = 0.9 + rnd() * 1.1; mb.scale(k, k, k);
              if (rnd() < 0.8) { mb.prism(0, 0, 0, 0.2, 0.15, 0.8, 5, '#5a3a24'); [[0.6, 1.6, 1.3], [1.5, 1.25, 1.2], [2.3, 0.9, 1.1], [3.0, 0.55, 0.9]].forEach(([y, r, h]) => { mb.prism(0, y, 0, r, 0, h, 6, '#2a5a3a'); mb.prism(0, y + h * 0.55, 0, r * 0.5, 0, h * 0.45, 6, '#e8f0f8'); }); }
              else mb.sphere(0, 0.3, 0, 1.2, 0.9, 1.1, '#6a6e78', 6, 4, false);
              mb.pop();
            });
          }
        }
      });
    }
  }

  function buildCourse(opts) {
    const legs = [];
    const mk = (def, start) => { const l = new Leg(def, start); legs.push(l); return l; };
    if (opts.mode === 'arcade' || opts.mode === 'gold_saucer') {
      const c = String(opts.course || 'A').toUpperCase();
      const st = { A: { w: 17, minLen: 70, maxLen: 150, maxTurn: 0.9, flip: 0.7, grade: 0.12, total: 2000 }, B: { w: 14, minLen: 55, maxLen: 120, maxTurn: 1.25, flip: 0.75, grade: 0.14, total: 2300 }, C: { w: 11.5, minLen: 40, maxLen: 90, maxTurn: 1.6, flip: 0.85, grade: 0.16, total: 2600 } }[c] || null;
      const rnd = MG.rng('gs-snowboard-' + c);
      const segs = segsFor(rnd, st.total, st);
      const def = { id: 'arcade' + c, theme: 'arcade', segs, items: [] };
      const leg = mk(def, { x: 0, y: 0, z: 0, yaw: 0 });
      // items: balloons in lines, obstacles, jumps
      const L = leg.path.length, items = def.items;
      const bal = { A: ['red', 'red', 'red', 'blue'], B: ['red', 'red', 'red', 'blue', 'blue', 'green'], C: ['red', 'red', 'blue', 'blue', 'green'] }[c];
      const obstN = { A: 0.25, B: 0.45, C: 0.7 }[c];
      for (let s = 70; s < L - 60; s += 34 + rnd() * 22) {
        const w = leg.path.at(s).w;
        const r = rnd();
        if (r < 0.34) { const u0 = (rnd() - 0.5) * (w - 4), u1 = U.clamp(u0 + (rnd() - 0.5) * 6, -w / 2 + 2, w / 2 - 2); balloonLine(items, s, (c === 'A' ? 3 : 2) + Math.floor(rnd() * 2), u0, u1, bal[Math.floor(rnd() * bal.length)], 6); }
        else if (r < 0.34 + obstN * 0.55) { const n = 1 + Math.floor(rnd() * (c === 'C' ? 3 : 2)); for (let k = 0; k < n; k++) items.push({ s: s + k * 4, u: (rnd() - 0.5) * (w - 3), type: rnd() < 0.5 ? 'tree' : 'rock' }); }
        else if (r < 0.85) { items.push({ s, u: 0, type: 'ramp' }); balloonLine(items, s + 16, 2, (rnd() - 0.5) * 3, (rnd() - 0.5) * 3, bal[Math.min(bal.length - 1, 1 + Math.floor(rnd() * (bal.length - 1)))], 5, 3.2); s += 20; }
        else { items.push({ s, u: -w / 2 + 1.2, type: 'flag' }); items.push({ s, u: w / 2 - 1.2, type: 'flag' }); }
      }
      items.push({ s: L - 8, u: 0, type: 'goal' });
      leg.items = items.filter(i => i.s < L - 5).sort((a, b) => a.s - b.s);
      return { legs, start: legs[0], arcade: true, course: c };
    }
    // ---- story: Icicle Inn -> Great Glacier
    const rnd = MG.rng('icicle-snowboard');
    const main = { w: 15, minLen: 60, maxLen: 130, maxTurn: 1.0, flip: 0.7, grade: 0.13 };
    const def0 = { id: 'main', theme: 'snow', segs: segsFor(rnd, 1250, main), items: [] };
    const it = def0.items;
    // balloon layout after the FAQ: 12 red, big jump (red / blue / green), 2 red, 1 blue, 1 red, 1 green,
    // 6 red, 6 blue, 2 red, 2 green, 4 blue, 4 green, tree section 5 red, then 1 red + 1 blue.
    balloonLine(it, 70, 6, -3, 3, 'red', 6); balloonLine(it, 130, 6, 3, -2, 'red', 6);
    it.push({ s: 200, u: 0, type: 'ramp' });
    it.push({ s: 218, u: -1.5, type: 'balloon', col: 'red', h: 3.0 }, { s: 224, u: 0, type: 'balloon', col: 'blue', h: 3.6 }, { s: 230, u: 1.5, type: 'balloon', col: 'green', h: 4.2 });
    balloonLine(it, 270, 2, -4, -2, 'red', 6); it.push({ s: 300, u: 4.5, type: 'balloon', col: 'blue', h: 1.3 }, { s: 330, u: -1, type: 'balloon', col: 'red', h: 1.3 }, { s: 360, u: -5, type: 'balloon', col: 'green', h: 2.6 });
    balloonLine(it, 400, 6, -4, 2, 'red', 6); balloonLine(it, 450, 6, 4, -2, 'blue', 6);
    balloonLine(it, 500, 2, 0, 1, 'red', 6); balloonLine(it, 520, 2, -5, -4, 'green', 7, 2.4);
    balloonLine(it, 560, 4, 4.5, 3, 'blue', 7); balloonLine(it, 600, 4, -4.5, -5.5, 'green', 7, 2.6);
    for (let s = 650; s < 820; s += 14) it.push({ s, u: (rnd() - 0.5) * 11, type: 'tree' });
    balloonLine(it, 670, 5, -2, 2, 'red', 30);
    for (let s = 850; s < 1180; s += 38) it.push({ s, u: (rnd() - 0.5) * 10, type: rnd() < 0.5 ? 'rock' : 'tree' });
    it.push({ s: 900, u: 1, type: 'balloon', col: 'red', h: 1.3 }, { s: 1000, u: -3, type: 'balloon', col: 'blue', h: 1.3 });
    const leg0 = mk(def0, { x: 0, y: 0, z: 0, yaw: 0 });
    // forks: branches start from the two halves of the parent's end
    const branch = (parent, sd, id, theme, len, st) => {
      const e = parent.endPoint(sd * parent.path.at(parent.path.length).w / 4);
      const w0 = parent.path.at(parent.path.length).w / 2;
      const segs = [{ len: 45, turn: sd * -0.55, dy: -45 * 0.12, w: st.w }].concat(segsFor(MG.rng(id), len, st).slice(1));
      segs[0].w0 = w0;
      const def = { id, theme, segs, items: [] };
      const l = mk(def, { x: e.x, y: e.y, z: e.z, yaw: e.yaw, w: w0 });
      const r2 = MG.rng(id + '-items'), obst = THEMES[theme].obst;
      for (let s = 60; s < l.path.length - 30; s += 16 + r2() * 16) {
        const w = l.path.at(s).w, type = obst[Math.floor(r2() * obst.length)];
        def.items.push({ s, u: (r2() - 0.5) * (w - 3), type, ph: r2() * 6 });
        if (type === 'penguin' && r2() < 0.6) def.items.push({ s: s + 3, u: (r2() - 0.5) * (w - 3), type, ph: r2() * 6 });
      }
      l.items = def.items.slice().sort((a, b) => a.s - b.s);
      return l;
    };
    const br = { w: 12, minLen: 50, maxLen: 100, maxTurn: 1.3, flip: 0.8, grade: 0.14 };
    const L1 = branch(leg0, -1, 'L', 'rocks', 380, br), R1 = branch(leg0, 1, 'R', 'ice', 380, br);
    leg0.next = [L1, R1]; leg0.fork = true;
    const LL = branch(L1, -1, 'LL', 'penguins', 400, Object.assign({}, br, { maxTurn: 1.6, minLen: 35, maxLen: 70 })), LR = branch(L1, 1, 'LR', 'redcave', 400, br);
    const RL = branch(R1, -1, 'RL', 'crystal', 400, br), RR = branch(R1, 1, 'RR', 'moogles', 400, br);
    L1.next = [LL, LR]; L1.fork = true; R1.next = [RL, RR]; R1.fork = true;
    [LL, LR, RL, RR].forEach(l => l.items.push({ s: l.path.length - 8, u: 0, type: 'end' }));
    // the rock divider + signs before each fork
    [leg0, L1, R1].forEach(l => { const L = l.path.length; l.items.push({ s: L - 6, u: 0, type: 'divider' }, { s: L - 30, u: -3, type: 'signL' }, { s: L - 30, u: 3, type: 'signR' }); l.items.sort((a, b) => a.s - b.s); });
    // no obstacles right at the forks
    [leg0, L1, R1].forEach(l => { const L = l.path.length; l.items = l.items.filter(i => i.type === 'divider' || i.type.startsWith('sign') || i.s < L - 45); });
    return { legs, start: leg0, arcade: false };
  }

  // ------------------------------------------------------------------ rider pose (sideways stance)
  function boardPose(m, o) {
    const b = (n) => m.b(n);
    const crouch = 0.55 + (o.crouch || 0);
    b('hips').pos[1] = -0.06 - (o.crouch || 0) * 0.05;
    b('thighL').rot[0] = -crouch; b('thighR').rot[0] = -crouch; b('shinL').rot[0] = crouch * 1.5; b('shinR').rot[0] = crouch * 1.5;
    b('footL').rot[0] = -crouch * 0.5; b('footR').rot[0] = -crouch * 0.5;
    b('thighL').rot[2] = 0.35; b('thighR').rot[2] = -0.35;
    b('torso').rot[0] = 0.25; b('head').rot[1] = -1.1;        // stands sideways, looks down the slope (to his right)
    b('armL').rot[2] = 1.2 + (o.lean || 0) * 0.4; b('armR').rot[2] = -1.0 + (o.lean || 0) * 0.4;
    b('foreL').rot[0] = -0.3; b('foreR').rot[0] = -0.3;
    if (o.air) { b('armL').rot[2] = 1.9; b('armR').rot[2] = -1.9; b('thighL').rot[0] = -1.1; b('thighR').rot[0] = -1.1; b('shinL').rot[0] = 1.7; b('shinR').rot[0] = 1.7; }
    if (o.crash) { b('armL').rot[0] = -2.5; b('armR').rot[0] = -2.2; b('head').rot[0] = 0.4; }
  }

  // ------------------------------------------------------------------ the game
  class SnowGame {
    constructor(opts, scene) {
      this.opts = opts; this.scene = scene;
      this.arcade = opts.mode === 'arcade' || opts.mode === 'gold_saucer';
      this.course = buildCourse(opts);
      this.course.legs.forEach(l => l.build());
      this.leg = this.course.start; this.s = 4; this.u = 0; this.uv = 0; this.h = 0; this.vh = 0; this.v = 0.15;
      this.air = false; this.crash = 0; this.bumpCd = 0; this.lean = 0; this.spin = 0;
      this.route = ''; this.bumps = 0; this.balloons = 0; this.balloonPts = 0; this.byCol = { red: 0, blue: 0, green: 0 };
      this.t = 0; this.time = 0; this.done = false; this.finished = 0;
      this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.camPos = null;
      this.botRoute = String(opts.route || (this.arcade ? '' : 'LR')).toUpperCase();
      this.rider = MG.char(opts.rider || 'cloud'); this.rider.scale = 1.45;
      this.board = MG.vehicleModel('snowboard', 1.45, 1.7, { color: '#d83030' });
      this.moogle = MG.char('moogle'); this.moogle.scale = 1.2;
      this.popups = [];
      this.visibleLegs = () => {
        const out = [this.leg];
        if (this.leg.fork && this.s > this.leg.path.length - 160) out.push(...this.leg.next);
        return out;
      };
    }
    get go() { return this.t >= MG.READY; }
    curvature(leg, s) { const a = leg.path.at(s), b = leg.path.at(s + 2); let d = b.yaw - a.yaw; return d / 2; }
    update(I) {
      this.t++;
      this.fx.update();
      this.popups = this.popups.filter(p => --p.t > 0);
      if (this.finished) { this.finished++; this.v *= 0.96; this.s += this.v; this.clampS(); if (this.finished > 100) this.complete(); return; }
      const go = this.go;
      if (go) this.time++;
      const leg = this.leg, p = leg.path, a = p.at(this.s);
      const th = leg.theme;
      const dir = go && this.crash <= 0 ? I.dir() : { x: 0, y: 0 };
      const edge = go && (I.held('l1') || I.held('r1'));
      const brake = go && (dir.y > 0 || I.held('square'));
      // ---- speed
      const slope = Math.sin(a.pitch);            // path pitch > 0 = downhill
      let acc = go ? 0.006 + slope * 0.07 : 0;
      if (this.air) acc = 0;
      this.v += acc;
      this.v -= this.v * (th.ice ? 0.004 : 0.0075) + this.v * this.v * 0.012;
      if (brake && !this.air) this.v *= 0.965;
      if (edge && !this.air) this.v *= 0.996;
      if (this.crash > 0) { this.crash--; this.v = Math.min(this.v, 0.12); this.spin += 0.3; if (this.crash === 0) this.spin = 0; }
      this.v = U.clamp(this.v, go && this.crash <= 0 && !this.finished ? 0.1 : 0, 0.66);
      if (!go) this.v = 0;
      // ---- steering + centrifugal drift
      const k = this.air ? 0.004 : (edge ? 0.03 : 0.018) * (th.ice ? 0.65 : 1);
      this.uv += dir.x * k;
      this.uv += this.curvature(leg, this.s) * this.v * this.v * (th.ice ? 3.0 : 2.2);    // a left turn (+yaw) throws the rider outward (+u)
      this.uv *= this.air ? 0.995 : (th.ice ? 0.95 : 0.9);
      this.u += this.uv;
      this.lean = U.lerp(this.lean, -dir.x * (edge ? 1 : 0.6), 0.15);
      // ---- walls
      const half = a.w / 2 - 0.5;
      if (Math.abs(this.u) > half) {
        this.u = Math.sign(this.u) * half; this.uv = -this.uv * 0.4;
        if (this.bumpCd <= 0 && this.v > 0.15 && !this.finished) { this.bump('wall'); }
        this.v *= 0.9;
      }
      if (this.bumpCd > 0) this.bumpCd--;
      // ---- vertical
      if (this.air) {
        this.vh -= G; this.h += this.vh;
        if (this.h <= 0) { this.h = 0; this.air = false; this.vh = 0; this.fx.burst(p.pos(this.s, this.u, 0.2), 8, '#ffffff', 0.08, 20, 0.25, 0.004, 'alpha'); MG.sfx('hop', 0.5); }
      } else if (go && this.crash <= 0 && I.pressed('cancel')) { this.air = true; this.vh = 0.17; MG.sfx('jump', 0.6); }
      // ---- advance
      const s0 = this.s;
      this.s += this.v;
      this.items(leg, s0, this.s);
      // snow spray
      if (!this.air && this.v > 0.3 && this.t % 2 === 0) this.fx.add(p.pos(this.s - 0.6, this.u, 0.15), [(Math.random() - 0.5) * 0.06 - this.uv, 0.05 + Math.random() * 0.04, 0], 18, '#ffffff', 0.22 + (edge ? 0.12 : 0), 0.004, 'alpha');
      this.clampS();
    }
    clampS() {
      const L = this.leg.path.length;
      if (this.s < L) return;
      if (this.leg.fork) {
        const right = this.u >= 0;
        const w = this.leg.path.at(L).w;
        this.route += right ? 'R' : 'L';
        this.s -= L;
        this.u = this.u + (right ? -w / 4 : w / 4);
        this.leg = this.leg.next[right ? 1 : 0];
        this.popups.push({ text: right ? 'RIGHT' : 'LEFT', t: 50 });
      } else if (!this.finished) {
        this.finished = 1; this.s = L - 0.01;
        MG.sfx('item');
      } else this.s = L - 0.01;
    }
    bump(kind) {
      this.bumps++; this.bumpCd = 30;
      MG.sfx('hit', 0.6);
      FF7.sceneMgr.doShake(3, 8);
    }
    items(leg, s0, s1) {
      for (const it of leg.items) {
        if (it.s < s0 - 3) continue;
        if (it.s > s1 + 3) break;
        if (it.hit) continue;
        const iu = this.itemU(it);
        const du = Math.abs(this.u - iu);
        const crossing = it.s >= s0 - 0.6 && it.s < s1 + 0.6;
        if (!crossing) continue;
        switch (it.type) {
          case 'balloon': {
            const top = this.h + 1.0;
            if (du < 1.1 && Math.abs(top - it.h) < 1.25) { it.hit = true; this.pop(it); }
            break;
          }
          case 'ramp':
            if (!this.air && du < 4) { this.air = true; this.vh = 0.12 + this.v * 0.25; this.h = 0.05; MG.sfx('jump', 0.7); }
            break;
          case 'goal': case 'end': case 'signL': case 'signR': case 'flag': break;
          default: {
            const r = { rock: 1.0, bigrock: 1.5, tree: 0.8, penguin: 0.55, snowball: 1.2, igloo: 2.0, crystal: 0.8, stalactite: 0.6, moogle: 0.6, divider: 1.8 }[it.type] || 0.8;
            const hh = { rock: 0.9, bigrock: 2.2, tree: 3.5, penguin: 0.9, snowball: 2.2, igloo: 1.6, crystal: 2.0, stalactite: this.stalH(it) + 2.4, moogle: 1.1, divider: 2 }[it.type] || 1;
            const low = it.type === 'stalactite' ? this.stalH(it) : 0;
            if (du < r + 0.35 && this.h < hh && this.h + 1.4 > low && this.crash <= 0) { it.hit = true; this.crashInto(it); }
          }
        }
      }
    }
    stalH(it) { const d = it.s - this.s; return d > 25 ? 6 : Math.max(0, 6 * (d / 25) * (d / 25)); }
    itemU(it) {
      if (it.type === 'snowball') return it.u + Math.sin(this.t * 0.03 + (it.ph || 0)) * 4;
      if (it.type === 'penguin') return it.u + Math.sin(this.t * 0.01 + (it.ph || 0)) * 1.5;
      if (it.type === 'moogle') { const w = this.leg.path.at(it.s).w; return ((((this.t * 0.06 + (it.ph || 0) * 5) % (w + 6)) + (w + 6)) % (w + 6)) - w / 2 - 3; }
      return it.u;
    }
    pop(it) {
      const b = BAL[it.col];
      this.balloons++; this.balloonPts += b.pts; this.byCol[it.col]++;
      MG.sfx('ching', 0.8);
      this.fx.burst(this.leg.path.pos(it.s, it.u, it.h), 10, b.col, 0.1, 18, 0.14, 0.004);
      this.popups.push({ text: '+' + b.pts, t: 30, col: b.col });
    }
    crashInto(it) {
      this.crash = 45; this.v *= 0.3; this.uv = 0; this.bump(it.type);
      this.fx.burst(this.leg.path.pos(this.s, this.u, 0.5), 14, '#ffffff', 0.12, 24, 0.3, 0.006, 'alpha');
    }
    complete() {
      if (this.done) return;
      const sec = Math.round(this.time / 60 * 100) / 100;
      if (this.arcade) {
        const c = this.course.course, par = PAR[c] || 63;
        const timePts = U.clamp(30 - Math.floor(Math.max(0, sec - par) / 2), 0, 30);
        const technique = U.clamp(30 - this.bumps, 0, 30);
        const balPts = Math.min(40, this.balloonPts);
        const score = timePts + technique + balPts;
        const rank = score >= 100 ? 'COOL' : score >= 70 ? 'GOOD' : score >= 30 ? 'AWFUL' : 'BAD';
        this.result = { won: score >= 70, score, time: sec, balloons: this.balloons, balloonPts: balPts, technique, timePts, rank, course: c };
      } else {
        const route = (this.route + 'LR').slice(0, 2);
        this.result = { won: true, score: this.balloonPts, time: sec, balloons: this.balloons, route, area: AREA[route] || 1, bumps: this.bumps };
      }
      this.done = true;
    }
    idle() { this.fx.update(); }

    // ---------------------------------------------------------------- bot
    bot() {
      if (!this.go || this.finished) return [];
      const out = [], leg = this.leg, p = leg.path, a = p.at(this.s);
      const look = 26 + this.v * 20;
      let target = 0, want = null, jump = false;
      // fork choice
      if (leg.fork && this.s > p.length - 70) { const c = this.botRoute[this.route.length] || (Math.random() < 0.5 ? 'L' : 'R'); target = (c === 'R' ? 1 : -1) * a.w / 4; want = target; }
      // balloons ahead (in the Gold Saucer's arcade the balloon points stop at 40: after that the clean line pays,
      // each bump costs a technique point)
      const balloonsDone = this.arcade && this.balloonPts >= 40;
      for (const it of leg.items) {
        if (balloonsDone) break;
        if (it.s < this.s + 2) continue; if (it.s > this.s + look) break;
        if (it.type === 'balloon' && !it.hit && want == null && it.h < 2.2) { want = it.u; }
      }
      if (want != null) target = want;
      // obstacles ahead: dodge or jump
      for (const it of leg.items) {
        if (it.s < this.s - 1) continue; if (it.s > this.s + 14 + this.v * 12) break;
        if (it.hit || ['balloon', 'goal', 'end', 'signL', 'signR', 'flag', 'ramp'].includes(it.type)) continue;
        const iu = this.itemU(it);
        if (Math.abs(target - iu) < 2.4) target = iu + (target >= iu ? 2.8 : -2.8);
        if (Math.abs(this.u - iu) < 1.7 && it.s - this.s < 5 + this.v * 6 && ['rock', 'penguin'].includes(it.type)) jump = true;
      }
      // high balloons: jump under them
      for (const it of leg.items) { if (balloonsDone) break; if (it.s < this.s) continue; if (it.s > this.s + 10) break; if (it.type === 'balloon' && !it.hit && it.h >= 2.2 && it.h < 3.0 && Math.abs(this.u - it.u) < 1 && it.s - this.s < 4 + this.v * 8) jump = true; }
      target = U.clamp(target, -a.w / 2 + 1.2, a.w / 2 - 1.2);
      // lead for drift: the rider's slide and the bend's outward throw over the next frames (FF7 players edge and slow
      // into the sharp bends rather than hit the wall: each bump costs a technique point)
      const bend = this.air ? 0 : this.curvature(leg, Math.min(p.length - 1, this.s + this.v * 8)) * this.v * this.v * (leg.theme && leg.theme.ice ? 3.0 : 2.2);
      const pred = this.u + (this.uv + bend * 6) * 12;
      if (pred < target - 0.5) out.push('right'); else if (pred > target + 0.5) out.push('left');
      if (Math.abs(pred - target) > 3) out.push('r1');
      if (!this.air && Math.abs(pred) > a.w / 2 - 0.8 && this.v > 0.3) out.push('down');
      if (jump && !this.air && this.t % 2 === 0) out.push('cancel');
      return out;
    }
    debugLog() { return `leg=${this.leg.def.id} s=${this.s.toFixed(0)}/${this.leg.path.length.toFixed(0)} v=${this.v.toFixed(2)} u=${this.u.toFixed(1)} bal=${this.balloons} bumps=${this.bumps}`; }

    // ---------------------------------------------------------------- render
    render() {
      const M = meshes(), leg = this.leg, p = leg.path;
      const cave = leg.theme.cave;
      MG.sky(cave ? '#1a0c0a' : '#5a8ad0', cave ? '#301810' : '#dce8f8', cave ? '#241410' : '#a8c4ec');
      const a = p.at(this.s);
      const rp = p.pos(this.s, this.u, this.h);
      // camera: behind + above, smoothed
      const back = p.pos(Math.max(0, this.s - 6.2), this.u * 0.6, 2.6 + this.h * 0.4);
      if (this.s < 6.2) { back[0] -= Math.sin(a.yaw) * (6.2 - this.s); back[2] -= Math.cos(a.yaw) * (6.2 - this.s); }
      if (!this.camPos) this.camPos = back.slice();
      for (let k = 0; k < 3; k++) this.camPos[k] = U.lerp(this.camPos[k], back[k], 0.25);
      const tgt = p.pos(Math.min(p.length, this.s + 9), this.u * 0.7, 0.4 + this.h * 0.5);
      if (this.s + 9 > p.length) { const e = a.yaw; tgt[0] += Math.sin(e) * (this.s + 9 - p.length); tgt[2] += Math.cos(e) * (this.s + 9 - p.length); }
      this.cam.set(this.camPos, tgt, 58, 0.3, 420);
      // pass 1: mountains
      if (!cave) {
        GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.5, -0.6, -0.4], color: [0.6, 0.6, 0.62], ambient: [0.55, 0.58, 0.66] } });
        this.cam.apply();
        MG.put(M.mountains, [this.camPos[0], this.camPos[1], this.camPos[2]]);
        GL.end();
      }
      GL.begin({ clear: [0, 0, 0, 0], fog: cave ? { color: [0.12, 0.05, 0.04], near: 25, far: 90 } : { color: [0.82, 0.88, 0.96], near: 70, far: 220 }, light: { dir: [-0.45, -0.75, -0.35], color: cave ? [0.6, 0.4, 0.34] : [0.66, 0.66, 0.68], ambient: cave ? [0.36, 0.26, 0.24] : [0.5, 0.53, 0.6] } });
      this.cam.apply();
      const legs = this.visibleLegs();
      legs.forEach(l => GL.draw(l.mesh, null));
      // items
      legs.forEach(l => {
        const s0 = l === leg ? this.s - 8 : -5, s1 = l === leg ? this.s + 170 : 170 - (leg.path.length - this.s);
        for (const it of l.items) {
          if (it.s < s0) continue; if (it.s > s1) break;
          if (it.hit && it.type === 'balloon') continue;
          this.drawItem(l, it);
        }
      });
      // rider
      if (!this.finished || this.finished < 100) {
        const yaw = a.yaw + this.uv * 2;
        const pitch = this.air ? 0 : a.pitch * 0.9;
        MG.shadow(rp[0], rp[1] - this.h, rp[2], 0.8, this.air ? 0.2 : 0.35);
        this.board.update && this.board.update();
        MG.drawModel(this.board, rp, yaw, pitch, -this.lean * 0.3);
        this.rider.onPose = (m) => boardPose(m, { lean: this.lean, air: this.air, crash: this.crash > 0, crouch: this.air ? 0 : Math.min(0.3, this.v * 0.3) });
        this.rider.update();
        const ry = yaw + Math.PI / 2 + (this.crash > 0 ? this.spin : 0);
        MG.drawModel(this.rider, [rp[0], rp[1] + 0.07, rp[2]], ry, this.lean * 0.35, 0);
      }
      this.fx.draw();
      GL.end();
      this.renderHUD();
    }
    drawItem(l, it) {
      const M = meshes(), p = l.path, a = p.at(it.s);
      const u = l === this.leg ? this.itemU(it) : it.u;
      switch (it.type) {
        case 'balloon': { const q = p.pos(it.s, u, it.h + Math.sin(this.t * 0.06 + it.s) * 0.15); MG.put(M.balloon[it.col], q, [0, this.t * 0.02, 0]); return; }
        case 'rock': case 'bigrock': case 'tree': case 'crystal': MG.put(M[it.type], p.pos(it.s, u, 0), [0, it.s, 0]); return;
        case 'penguin': MG.put(M.penguin, p.pos(it.s, u, Math.abs(Math.sin(this.t * 0.15 + it.s)) * 0.08), [0, a.yaw + Math.PI + Math.sin(this.t * 0.15 + it.s) * 0.3, 0]); return;
        case 'snowball': { const r = 1.1; MG.put(M.snowball, p.pos(it.s, u, r), [this.t * 0.1, 0, 0], r); return; }
        case 'igloo': MG.put(M.igloo, p.pos(it.s, u, 0), [0, a.yaw + Math.PI, 0]); return;
        case 'stalactite': MG.put(M.stalactite, p.pos(it.s, u, (l === this.leg ? this.stalH(it) : 6) + 2.4), [0, it.s, 0]); return;
        case 'moogle': { this.moogle.play('run'); this.moogle.update(); MG.drawModel(this.moogle, p.pos(it.s, u, 0), a.yaw - Math.PI / 2); return; }
        case 'ramp': MG.put(M.ramp, p.pos(it.s, 0, 0), [0, a.yaw, 0], [a.w * 0.6, 1, 2.2]); return;
        case 'flag': MG.put(M.flag, p.pos(it.s, u, 0), [0, a.yaw, 0]); return;
        case 'goal': case 'end': MG.put(M.gate, p.pos(it.s, -a.w / 2 + 0.6, 0), [0, a.yaw, 0], [1, 1.2, 1]); MG.put(M.gate, p.pos(it.s, a.w / 2 - 0.6, 0), [0, a.yaw, 0], [1, 1.2, 1]); return;
        case 'divider': MG.put(M.divider, p.pos(it.s + 4, 0, 0), [0, a.yaw, 0]); return;
        case 'signL': case 'signR': { const sd = it.type === 'signL' ? 1 : -1; MG.put(M.sign, p.pos(it.s, u, 0), [0, a.yaw + Math.PI, 0]); MG.put(M.arrowL, p.pos(it.s, u, 0), [0, a.yaw + Math.PI, sd > 0 ? 0 : Math.PI], [1, sd > 0 ? 1 : 1, 1]); return; }
      }
    }
    renderHUD() {
      R.window(12, 10, 150, 40);
      R.text('TIME', 22, 15, { size: 12, color: R.COL.cyan });
      R.text(MG.fmtTime(this.time), 150, 22, { size: 17, align: 'right' });
      R.window(W - 172, 10, 160, 40);
      R.text('BALLOON', W - 162, 15, { size: 12, color: R.COL.cyan });
      R.text(String(this.arcade ? Math.min(40, this.balloonPts) : this.balloonPts), W - 24, 22, { size: 17, align: 'right' });
      // course progress
      const legs = this.course.legs;
      let tot = 0, done = 0;
      if (this.arcade) { tot = this.leg.path.length; done = this.s; }
      else { const depth = this.route.length; const lens = [legs[0].path.length, 380, 400]; tot = lens.reduce((x, y) => x + y, 0); done = lens.slice(0, depth).reduce((x, y) => x + y, 0) + this.s; }
      R.bar(W / 2 - 100, 18, 200, 5, done / tot, '#6080ff', '#c0e0ff');
      this.popups.forEach((pp, i) => R.text(pp.text, W / 2, 110 - i * 20 - (30 - Math.min(30, pp.t)), { size: 22, weight: '800', align: 'center', color: pp.col ? BAL[pp.col] && BAL[pp.col].col : '#ffe060' }));
      ui.readyGo(this.t, 190);
      if (this.finished) ui.big(this.arcade ? 'GOAL!' : '', 190, '#ffe060', 48);
    }
    resultTitle(r) { return this.arcade ? r.rank : 'GREAT GLACIER'; }
    resultRows(r) {
      if (this.arcade) return [['Course', r.course], ['Time', `${r.time.toFixed(2)}s`], ['Time pts', r.timePts], ['Technique', r.technique], ['Balloon', r.balloonPts], ['Total', r.score, '#ffe060']];
      return [['Time', `${r.time.toFixed(2)}s`], ['Balloons', `${r.balloons}  (${r.score} pts)`], ['Route', r.route.split('').map(c => c === 'L' ? 'Left' : 'Right').join(' / ')]];
    }
  }

  MG.register('snowboard', {
    title: 'Snowboarding',
    music: () => 'snow',
    help: (o) => ({
      title: (o.mode === 'arcade' || o.mode === 'gold_saucer') ? `SNOWBOARD  COURSE ${String(o.course || 'A').toUpperCase()}` : 'SNOWBOARD',
      lines: (o.mode === 'arcade' || o.mode === 'gold_saucer')
        ? ['Ride to the goal as fast as you can. Pop balloons for points: red 1, blue 3, green 5.', 'Score: Time 30 + Technique 30 + Balloons 40. Bumping into things costs Technique points.']
        : ['Slide down the mountain to the Great Glacier! Grab balloons on the way.', 'The trail splits twice. The paths you choose decide where you end up on the glacier.'],
      controls: [[['left', 'right'], 'Turn'], [['cancel'], 'Jump'], [['down', '/', 'square'], 'Brake'], [['l1', '/', 'r1'], 'Edge (sharp turn)']],
    }),
    create: (opts, scene) => new SnowGame(opts, scene),
  });
})();
