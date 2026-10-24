// Speed Square shooting coaster (Gold Saucer): ride the rails through themed zones and blast the
// targets with the laser gun. Target list and points follow the Gold Saucer FAQ (Ghost 40, Cactus 30,
// Yellow Boulder 200, Red Wheel of the boat: hold the laser for up to 285, Large UFO 1000 ...).
//   D-pad moves the crosshair, ○ or □ fires (hold for continuous fire).
//   Result { won: score >= 3000 (prize), score, hits, shots }   Prizes (script): 3000+ and 5000+.
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, V3 = FF7.V3, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;

  // zones along the ride: [name, from, to, sky top, sky bottom, ground]
  const ZONES = [
    ['haunted', 0, 380, '#140a20', '#301838', '#2a2230'],
    ['canyon', 380, 820, '#e09050', '#f8d8a0', '#c08050'],
    ['sky', 820, 1160, '#3a80e0', '#c8e0f8', '#e8f0ff'],
    ['sea', 1160, 1460, '#4a90d0', '#d0e8f8', '#2a6aa8'],
    ['space', 1460, 1860, '#020208', '#140a30', '#181030'],
    ['ice', 1860, 2200, '#80a8d8', '#e8f0fa', '#d8e8f8'],
    ['volcano', 2200, 2460, '#401010', '#c04020', '#3a1a14'],
    ['festival', 2460, 2820, '#f0a0c0', '#fff0d0', '#80c060'],
    ['finale', 2820, 3160, '#101838', '#304880', '#202838'],
  ];
  const zoneAt = (s) => ZONES.find(z => s >= z[1] && s < z[2]) || ZONES[ZONES.length - 1];
  // target types: points, hit radius (m), mesh builder key
  const TYPES = {
    ghost: { pts: 40, r: 0.9 }, cactus: { pts: 30, r: 0.9 }, bigcactus: { pts: 50, r: 1.4 }, boulder: { pts: 200, r: 1.6 },
    plane: { pts: 50, r: 1.2 }, jet: { pts: 50, r: 1.2 }, sub: { pts: 60, r: 1.4 }, wheel: { pts: 15, r: 1.8, hold: 285 },
    star: { pts: 40, r: 0.9 }, ufo: { pts: 60, r: 1.0 }, rocket: { pts: 50, r: 0.9 }, icicle: { pts: 40, r: 0.8 }, crystal: { pts: 70, r: 1.0 },
    shard: { pts: 50, r: 1.0 }, lava: { pts: 70, r: 1.0 }, balloon: { pts: 30, r: 0.9 }, bigballoon: { pts: 70, r: 1.8 }, chopper: { pts: 40, r: 1.1 },
    flashufo: { pts: 80, r: 1.0 }, bigufo: { pts: 1000, r: 4.0, hp: 12 }, headlight: { pts: 200, r: 0.6 },
  };

  let MESH = null;
  function meshes() {
    if (MESH) return MESH;
    const M = MESH = {};
    const mk = (fn, o) => MG.mesh(fn, o);
    M.ghost = mk(mb => { mb.sphere(0, 0.3, 0, 0.6, 0.7, 0.5, '#e8f0ff', 8, 6, true); mb.spike([0, -0.3, 0], [0, -1, 0.2], 0.6, 0.4, 6, '#d0dcf0'); mb.sphere(0.2, 0.45, 0.42, 0.1, 0.14, 0.05, '#101020', 6, 4, true); mb.sphere(-0.2, 0.45, 0.42, 0.1, 0.14, 0.05, '#101020', 6, 4, true); });
    M.cactus = mk(mb => { mb.prism(0, 0, 0, 0.3, 0.26, 2, 8, '#3a8a3a', true); mb.push(); mb.translate(0.3, 0.9, 0); mb.rotate(0, 0, -1.2); mb.prism(0, 0, 0, 0.18, 0.15, 0.6, 6, '#3a8a3a'); mb.pop(); mb.prism(0.72, 1.05, 0, 0.16, 0.13, 0.6, 6, '#3a8a3a'); });
    M.bigcactus = M.cactus;
    M.boulder = mk(mb => mb.sphere(0, 0, 0, 1.5, 1.4, 1.5, '#e0c040', 8, 6, false));
    M.plane = mk(mb => { mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -1.3, rx: 0.1, rz: 0.1 }, { y: -0.8, rx: 0.3, rz: 0.3 }, { y: 1.0, rx: 0.3, rz: 0.3 }, { y: 1.4, rx: 0.1, rz: 0.1 }], { sides: 8, color: '#3060d0' }); mb.pop(); mb.box(0, 0, 0.2, 3, 0.08, 0.6, '#4070e0'); mb.box(0, 0.3, -1.1, 0.08, 0.6, 0.4, '#4070e0'); mb.box(0, 0, -1.1, 1.2, 0.06, 0.3, '#4070e0'); });
    M.jet = mk(mb => { mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -1.4, rx: 0.2, rz: 0.2 }, { y: 1.0, rx: 0.3, rz: 0.26 }, { y: 1.7, rx: 0.02, rz: 0.02 }], { sides: 8, color: '#8a9098' }); mb.pop(); mb.tri([0, 0, 0.8], [1.6, 0, -0.8], [-1.6, 0, -0.8], '#7a8088'); mb.tri([0, 0, 0.8], [-1.6, 0, -0.8], [1.6, 0, -0.8], '#7a8088'); mb.box(0, 0.4, -1.1, 0.06, 0.7, 0.5, '#7a8088'); });
    M.sub = mk(mb => { mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -1.6, rx: 0.1, rz: 0.1 }, { y: -1.2, rx: 0.55, rz: 0.55 }, { y: 1.2, rx: 0.55, rz: 0.55 }, { y: 1.6, rx: 0.1, rz: 0.1 }], { sides: 10, color: '#f0d020' }); mb.pop(); mb.box(0, 0.7, 0.2, 0.5, 0.6, 0.8, '#e0c010'); mb.box(0, 1.2, 0.4, 0.06, 0.5, 0.06, '#606060'); });
    M.wheel = mk(mb => { mb.push(); mb.rotate(0, 0, 0); mb.prism(0, -0.1, 0, 1.6, 1.6, 0.2, 16, '#c02020', false); mb.pop(); for (let i = 0; i < 8; i++) { mb.push(); mb.rotate(0, i * Math.PI / 4, 0); mb.box(0, 0, 1.9, 0.2, 0.2, 0.8, '#d04040'); mb.pop(); } }, { cull: false });
    M.star = mk(mb => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mb.blade([0, 0, 0], [Math.sin(a), Math.cos(a), 0], 0.9, 0.5, 0.25, '#ffe040'); } }, { unlit: true });
    M.ufo = mk(mb => { mb.sphere(0, 0, 0, 1, 0.3, 1, '#b0b8c8', 12, 5, true); mb.sphere(0, 0.25, 0, 0.45, 0.35, 0.45, '#80e0ff', 10, 5, true); });
    M.flashufo = M.ufo;
    M.bigufo = mk(mb => { mb.sphere(0, 0, 0, 4, 1.1, 4, '#9098a8', 16, 6, true); mb.sphere(0, 0.9, 0, 1.8, 1.3, 1.8, '#60d0ff', 12, 6, true); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mb.sphere(Math.cos(a) * 3.2, -0.3, Math.sin(a) * 3.2, 0.3, 0.3, 0.3, '#ffe060', 6, 4, true); } });
    M.rocket = mk(mb => { mb.prism(0, -0.8, 0, 0.3, 0.3, 1.2, 8, '#f080b0', true); mb.prism(0, 0.4, 0, 0.3, 0, 0.6, 8, '#e04080'); [0, 1, 2].forEach(i => { mb.push(); mb.rotate(0, i * 2.1, 0); mb.box(0.35, -0.6, 0, 0.3, 0.5, 0.06, '#e04080'); mb.pop(); }); });
    M.icicle = mk(mb => mb.spike([0, 1, 0], [0, -1, 0], 2, 0.35, 5, '#c0e8ff'));
    M.shard = mk(mb => { mb.spike([0, 0, 0], [0.3, 1, 0.2], 1.6, 0.4, 4, '#a0d8f8'); mb.spike([0, 0, 0], [-0.4, -0.8, 0.1], 1.2, 0.3, 4, '#a0d8f8'); });
    M.crystal = mk(mb => { mb.spike([0, 0, 0], [0, 1, 0], 1.2, 0.6, 6, '#80f0ff'); mb.spike([0, 0, 0], [0, -1, 0], 1.2, 0.6, 6, '#60d0f0'); }, { unlit: true });
    M.lava = mk(mb => { mb.sphere(0, 0, 0, 0.8, 0.7, 0.8, '#402018', 7, 5, false); mb.sphere(0.2, 0.2, 0.4, 0.4, 0.3, 0.3, '#ff6020', 6, 4, true); });
    M.balloon = {};
    ['#e03040', '#3060e0', '#30b040', '#e0c020', '#c040c0'].forEach((c, i) => { M.balloon[i] = mk(mb => { mb.sphere(0, 0, 0, 0.6, 0.72, 0.6, c, 10, 7, true); mb.box(0, -1.1, 0, 0.02, 0.8, 0.02, '#f0f0f0'); }); });
    M.bigballoon = mk(mb => { mb.sphere(0, 0, 0, 1.6, 1.9, 1.6, '#f06020', 12, 8, true); mb.box(0, -2.4, 0, 0.8, 0.5, 0.8, '#8a5a2a'); });
    M.chopper = mk(mb => { mb.sphere(0, 0, 0, 0.6, 0.5, 0.9, '#e04030', 8, 6, true); mb.box(0, 0.1, -1.2, 0.12, 0.12, 1.4, '#c03020'); mb.box(0, 0.62, 0, 2.4, 0.04, 0.16, '#303030'); mb.box(0, -0.55, 0, 0.8, 0.06, 1.2, '#404040'); });
    M.headlight = mk(mb => { mb.box(0, -1.5, 0, 0.12, 3, 0.12, '#606060'); mb.sphere(0, 0.1, 0, 0.35, 0.3, 0.3, '#fff8c0', 8, 6, true); }, { unlit: true });
    M.boom = mk(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#ffd060', 8, 6, true), { unlit: true, blend: 'add' });
    return M;
  }

  // the ride
  function buildRide() {
    const segs = [
      { len: 120, turn: 0 }, { len: 140, turn: 1.4 }, { len: 120, turn: -0.8, dy: -6 },                 // haunted house
      { len: 160, turn: -1.2, dy: -8 }, { len: 160, turn: 1.6 }, { len: 120, turn: 0, dy: 10 },           // canyon
      { len: 180, turn: -1.8, dy: 30 }, { len: 160, turn: 0.8, dy: -12 },                                 // up into the sky
      { len: 150, turn: 1.4, dy: -26 }, { len: 150, turn: -0.9 },                                          // down to the sea
      { len: 200, turn: -1.6, dy: 20 }, { len: 200, turn: 2.0, dy: 10 },                                  // space loop
      { len: 170, turn: -1.2, dy: -20 }, { len: 170, turn: 1.2, dy: -6 },                                 // ice cave
      { len: 130, turn: -1.4 }, { len: 130, turn: 1.0, dy: -4 },                                           // volcano
      { len: 180, turn: -1.6, dy: 14 }, { len: 180, turn: 1.2 },                                           // festival
      { len: 180, turn: -0.8, dy: -10 }, { len: 160, turn: 0.6, dy: -2 },                                 // finale
    ];
    const path = new MG.Path(segs, { w: 3, step: 1 });
    const L = path.length;
    const rnd = MG.rng('speed-square');
    const mesh = MG.mesh(mb => {
      // rails + sleepers
      path.strip(mb, 0, L, -0.75, -0.62, '#b0b8c4', { stride: 2, lift: 0.15 });
      path.strip(mb, 0, L, 0.62, 0.75, '#b0b8c4', { stride: 2, lift: 0.15 });
      for (let s = 0; s < L; s += 1.5) { const a = path.at(s), p = path.pos(s, 0, 0.05); mb.push(); mb.translate(p[0], p[1], p[2]); mb.rotate(0, a.yaw, 0); mb.box(0, 0, 0, 1.8, 0.1, 0.3, '#5a4a3a'); mb.pop(); }
      // supports down to the ground
      for (let s = 0; s < L; s += 12) { const p = path.pos(s, 0, 0); mb.box(p[0], p[1] - 6, p[2], 0.3, 12, 0.3, '#808890'); }
      // zone scenery: ground + walls/props
      for (const z of ZONES) {
        const [name, s0, s1, , , ground] = z;
        path.strip(mb, s0, s1, -60, 60, ground, { stride: 6, lift: -12 });
        for (let s = s0; s < s1; s += 6) [-1, 1].forEach(sd => {
          if (rnd() < 0.45) return;
          const u = sd * (5 + rnd() * 22), p = path.pos(s, u, 0);
          mb.push(); mb.translate(p[0], p[1] - 12, p[2]); mb.rotate(0, rnd() * 6, 0);
          const k = rnd();
          switch (name) {
            case 'haunted': if (k < 0.5) { mb.box(0, 0.8, 0, 0.8, 1.6, 0.2, '#6a6a70'); } else { mb.prism(0, 0, 0, 0.3, 0.1, 6 + rnd() * 6, 5, '#2a2018'); } break;
            case 'canyon': mb.prism(0, 0, 0, 4 + rnd() * 5, 3 + rnd() * 3, 14 + rnd() * 20, 6, U.mix('#b06030', '#d08850', rnd())); break;
            case 'sky': mb.sphere(0, 12 + rnd() * 20, 0, 4 + rnd() * 5, 1.6 + rnd(), 3 + rnd() * 4, '#ffffff', 8, 5, true); break;
            case 'sea': if (k < 0.3) mb.sphere(0, 0, 0, 3 + rnd() * 3, 2 + rnd() * 3, 3, '#6a7a5a', 6, 4, false); break;
            case 'space': mb.box(0, 5 + rnd() * 40, 0, 0.3, 0.3, 0.3, '#ffffff'); break;
            case 'ice': mb.prism(0, 0, 0, 3 + rnd() * 3, 0.5, 16 + rnd() * 18, 5, U.mix('#b8d8f0', '#e8f4ff', rnd())); break;
            case 'volcano': mb.prism(0, 0, 0, 5 + rnd() * 5, 1 + rnd() * 2, 10 + rnd() * 16, 6, U.mix('#3a2018', '#5a3020', rnd())); break;
            case 'festival': if (k < 0.5) { mb.box(0, 3, 0, 4, 6, 4, U.mix('#e08080', '#80a0e0', rnd())); mb.prism(0, 6, 0, 3, 0, 2.5, 4, '#e0c040'); } else { mb.prism(0, 0, 0, 0.3, 0.25, 4, 6, '#6a4a2a'); mb.sphere(0, 5, 0, 2, 2, 2, '#50a040', 8, 5, true); } break;
            case 'finale': mb.box(0, 5 + rnd() * 10, 0, 3, 10 + rnd() * 20, 3, U.mix('#303850', '#505878', rnd())); break;
          }
          mb.pop();
        });
      }
      // sea surface
      const sea = ZONES.find(z => z[0] === 'sea');
      path.strip(mb, sea[1] - 20, sea[2] + 20, -60, 60, '#3a80c0', { stride: 6, lift: -2 - 0 });
    });
    return { path, mesh, L };
  }

  function makeTargets(path, L) {
    const rnd = MG.rng('coaster-targets');
    const T = [];
    const add = (type, s, u, h, o = {}) => T.push(Object.assign({ type, s, u, h, d: TYPES[type], alive: true, t: 0, hp: TYPES[type].hp || 1, got: 0 }, o));
    const spread = (type, n, s0, s1, fn) => { for (let i = 0; i < n; i++) { const s = U.lerp(s0, s1, (i + rnd() * 0.6) / n); fn(s, i); } };
    spread('ghost', 10, 40, 360, (s, i) => add('ghost', s, (i % 2 ? 1 : -1) * (3 + rnd() * 3), 1 + rnd() * 3, { pop: 1 }));
    spread('cactus', 5, 420, 700, (s, i) => add('cactus', s, (i % 2 ? 1 : -1) * (4 + rnd() * 4), -1.5));
    add('bigcactus', 740, 5, 6, { fall: 1 }); add('boulder', 760, -9, 12);
    spread('plane', 9, 830, 1140, (s, i) => add('plane', s, (i % 2 ? 1 : -1) * 14, 3 + rnd() * 5, { vx: (i % 2 ? -1 : 1) * 0.2 }));
    spread('jet', 11, 850, 1150, (s, i) => add('jet', s, (i % 2 ? -1 : 1) * 16, 6 + rnd() * 5, { vx: (i % 2 ? 1 : -1) * 0.3 }));
    spread('sub', 3, 1180, 1330, (s, i) => add('sub', s, (i - 1) * 7, -2.5, { rise: 1 }));
    add('wheel', 1400, 7, 1.5);
    spread('star', 10, 1480, 1840, (s, i) => add('star', s, (rnd() - 0.5) * 16, 2 + rnd() * 6));
    spread('ufo', 9, 1500, 1850, (s, i) => add('ufo', s, (i % 2 ? 1 : -1) * 10, 4 + rnd() * 4, { vx: (i % 2 ? -1 : 1) * 0.15 }));
    spread('rocket', 8, 1520, 1840, (s, i) => add('rocket', s, (rnd() - 0.5) * 14, -4, { vy: 0.12 }));
    spread('icicle', 10, 1880, 2180, (s, i) => add('icicle', s, (rnd() - 0.5) * 8, 5 + rnd() * 2));
    spread('crystal', 6, 1900, 2190, (s, i) => add('crystal', s, (i % 2 ? 1 : -1) * (4 + rnd() * 3), 1 + rnd() * 3));
    spread('shard', 7, 1890, 2190, (s, i) => add('shard', s, (rnd() - 0.5) * 12, 3 + rnd() * 3, { spin: 1 }));
    spread('lava', 7, 2220, 2450, (s, i) => add('lava', s, (rnd() - 0.5) * 12, -6, { vy: 0.28, grav: 0.006 }));
    spread('balloon', 19, 2480, 2800, (s, i) => add('balloon', s, (rnd() - 0.5) * 16, 1 + rnd() * 6, { col: i % 5, vy: 0.015 }));
    add('bigballoon', 2640, -8, 8);
    spread('chopper', 8, 2500, 2800, (s, i) => add('chopper', s, (i % 2 ? 1 : -1) * 12, 6 + rnd() * 3, { vx: (i % 2 ? -1 : 1) * 0.12 }));
    spread('flashufo', 3, 2840, 2900, (s, i) => add('flashufo', s, (i - 1) * 6, 5, { vx: (i - 1) * 0.1 }));
    add('bigufo', 2960, 0, 10, { ahead: 26 });
    add('chopper', 3010, 8, 5, { vx: -0.15 }); add('plane', 3030, -12, 6, { vx: 0.2, pts: 60 }); add('jet', 3050, 14, 7, { vx: -0.3, pts: 60 });
    add('headlight', 3090, -3.2, 1.2);
    T.sort((a, b) => a.s - b.s);
    return T;
  }

  class ShootGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.ride = buildRide();
      this.targets = makeTargets(this.ride.path, this.ride.L);
      this.s = 0; this.v = 0.3; this.cx = W / 2; this.cy = H / 2 - 20; this.cvx = 0; this.cvy = 0;
      this.score = 0; this.hits = 0; this.shots = 0; this.cd = 0; this.beam = 0; this.popups = [];
      this.end = this.ride.L - 30;
    }
    get go() { return this.t >= MG.READY; }
    tpos(tg) {
      const p = this.ride.path;
      const base = p.pos(tg.s + (tg.ahead || 0), tg.u + (tg.vx || 0) * tg.t, 0);
      const zr = zoneAt(tg.s);
      let h = tg.h + (tg.vy || 0) * tg.t - (tg.grav || 0) * tg.t * tg.t / 2;
      if (tg.pop) h += Math.min(0, -3 + tg.t * 0.15);
      if (tg.rise) h += Math.min(3, tg.t * 0.05);
      if (tg.fall && tg.hitT) h -= (this.t - tg.hitT) * 0.2;
      return [base[0], base[1] + h, base[2]];
    }
    update(I) {
      this.t++; this.fx.update();
      this.popups = this.popups.filter(p => --p.t > 0);
      if (this.over) { if (++this.over > 120) { this.result = { won: this.score >= 3000, score: this.score, hits: this.hits, shots: this.shots }; this.done = true; } return; }
      const p = this.ride.path, a = p.at(this.s);
      // coaster speed: gravity on slopes
      if (this.go) { this.v += Math.sin(a.pitch) * 0.01; this.v += (0.5 - this.v) * 0.01; this.v = U.clamp(this.v, 0.35, 0.8); this.s += this.v; }
      if (this.s >= this.end) { this.over = 1; MG.sfx('item'); return; }
      // crosshair
      const d = this.go ? I.dir() : { x: 0, y: 0 };
      this.cvx = U.lerp(this.cvx, d.x * 7, 0.3); this.cvy = U.lerp(this.cvy, d.y * 7, 0.3);
      this.cx = U.clamp(this.cx + this.cvx, 20, W - 20); this.cy = U.clamp(this.cy + this.cvy, 20, H - 60);
      // targets live while near
      for (const tg of this.targets) { if (tg.s > this.s + 90) break; if (tg.s > this.s - 20) tg.t++; }
      // fire
      if (this.cd > 0) this.cd--;
      if (this.beam > 0) this.beam--;
      const firing = this.go && (I.held('ok') || I.held('square'));
      if (firing && this.cd <= 0) { this.cd = 7; this.beam = 5; this.shots++; MG.sfx('shot2', 0.3); this.fire(); }
    }
    fire() {
      // hit test in screen space against targets in view
      this.cam.set(...this.camArgs());
      let best = null, bd = 1e9;
      for (const tg of this.targets) {
        if (tg.s > this.s + 90) break;
        if (!tg.alive || tg.s < this.s - 10) continue;
        const wp = this.tpos(tg), q = this.cam.project(wp);
        if (!q.visible || q.depth < 2 || q.depth > 90) continue;
        const rad = Math.max(9, tg.d.r / q.depth * 470);
        const dd = Math.hypot(q.x - this.cx, q.y - this.cy);
        if (dd < rad && q.depth < bd) { bd = q.depth; best = { tg, wp }; }
      }
      if (!best) return;
      const tg = best.tg;
      if (tg.d.hold) {                         // the red wheel: points while you keep hitting it
        const add = Math.min(tg.d.pts, tg.d.hold - tg.got);
        if (add > 0) { tg.got += add; this.gain(add, best.wp, 0.3); }
        else { tg.alive = false; this.fx.burst(best.wp, 20, '#ffd060', 0.3, 30, 0.5, 0.004); }
        return;
      }
      tg.hp--;
      this.fx.burst(best.wp, 6, '#ffffff', 0.15, 12, 0.3, 0);
      if (tg.hp > 0) { MG.sfx('hit', 0.4); return; }
      tg.alive = false; tg.hitT = this.t; this.hits++;
      this.gain(tg.pts || tg.d.pts, best.wp, 1);
      this.fx.burst(best.wp, tg.type === 'bigufo' ? 40 : 16, '#ffd060', tg.type === 'bigufo' ? 0.6 : 0.25, 26, tg.type === 'bigufo' ? 1.5 : 0.5, 0.004);
      MG.sfx(tg.type === 'bigufo' ? 'bosskill' : 'ching', 0.5);
    }
    gain(n, wp, k) { this.score += n; const q = this.cam.project(wp); this.popups.push({ text: '+' + n, x: q.x, y: q.y, t: 40 }); }
    idle() { this.fx.update(); }
    camArgs() {
      const p = this.ride.path;
      const eye = p.pos(this.s, 0, 2.2), tgt = p.pos(this.s + 12, 0, 1.6 + Math.sin(this.t * 0.03) * 0.1);
      return [eye, tgt, 60, 0.3, 400];
    }
    bot() {
      if (!this.go || this.over) return [];
      this.cam.set(...this.camArgs());
      let best = null, bd = 1e9;
      for (const tg of this.targets) {
        if (tg.s > this.s + 80) break;
        if (!tg.alive || tg.s < this.s - 5) continue;
        const q = this.cam.project(this.tpos(tg));
        if (!q.visible || q.depth < 3 || q.depth > 70 || q.x < 0 || q.x > W || q.y < 0 || q.y > H - 60) continue;
        const dd = Math.hypot(q.x - this.cx, q.y - this.cy) + q.depth * 3;
        if (dd < bd) { bd = dd; best = q; }
      }
      const out = [];
      if (!best) return out;
      if (best.x > this.cx + 6) out.push('right'); else if (best.x < this.cx - 6) out.push('left');
      if (best.y > this.cy + 6) out.push('down'); else if (best.y < this.cy - 6) out.push('up');
      if (Math.hypot(best.x - this.cx, best.y - this.cy) < 24) out.push('ok');
      return out;
    }
    debugLog() { return `s=${this.s.toFixed(0)} zone=${zoneAt(this.s)[0]} score=${this.score} hits=${this.hits}/${this.shots}`; }
    render() {
      const M = meshes(), z = zoneAt(this.s);
      MG.sky(z[3], z[4]);
      this.cam.set(...this.camArgs());
      const dark = z[0] === 'haunted' || z[0] === 'space' || z[0] === 'finale';
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: MG.hexf(z[4]), near: 50, far: 140 }, light: { dir: [-0.4, -0.8, -0.4], color: dark ? [0.5, 0.45, 0.6] : [0.72, 0.7, 0.66], ambient: dark ? [0.4, 0.36, 0.5] : [0.5, 0.5, 0.54] } });
      this.cam.apply();
      GL.draw(this.ride.mesh, null);
      for (const tg of this.targets) {
        if (tg.s > this.s + 90) break;
        if (tg.s < this.s - 15 || (!tg.alive && !(tg.fall && tg.hitT))) continue;
        const wp = this.tpos(tg);
        const mesh = tg.type === 'balloon' ? M.balloon[tg.col] : M[tg.type];
        const face = this.ride.path.at(tg.s).yaw + Math.PI;
        const spin = tg.type === 'wheel' ? [Math.PI / 2, face, this.t * 0.05] : tg.type === 'star' || tg.type === 'crystal' || tg.spin ? [0, this.t * 0.05, 0] : tg.vx ? [0, face + (tg.vx > 0 ? -Math.PI / 2 : Math.PI / 2), 0] : [0, face, 0];
        const sc = tg.type === 'bigcactus' ? 1.8 : 1;
        MG.put(mesh, wp, spin, sc, tg.type === 'flashufo' ? { add: [(this.t >> 2) % 2 ? 0.5 : 0, 0.2, 0.4] } : undefined);
      }
      this.fx.draw();
      GL.end();
      // laser beam + crosshair
      const c = R.ctx;
      if (this.beam > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,80,80,0.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(W / 2 + 60, H); c.lineTo(this.cx, this.cy); c.stroke(); c.strokeStyle = 'rgba(255,220,220,0.9)'; c.lineWidth = 1; c.stroke(); c.restore(); }
      c.save(); c.strokeStyle = '#ffe040'; c.lineWidth = 2; c.beginPath(); c.arc(this.cx, this.cy, 13, 0, Math.PI * 2); c.moveTo(this.cx - 20, this.cy); c.lineTo(this.cx - 6, this.cy); c.moveTo(this.cx + 6, this.cy); c.lineTo(this.cx + 20, this.cy); c.moveTo(this.cx, this.cy - 20); c.lineTo(this.cx, this.cy - 6); c.moveTo(this.cx, this.cy + 6); c.lineTo(this.cx, this.cy + 20); c.stroke(); c.restore();
      // gun + car front
      c.fillStyle = '#303848'; c.beginPath(); c.moveTo(W / 2 + 40, H); c.lineTo(W / 2 + 56, H - 46); c.lineTo(W / 2 + 76, H - 46); c.lineTo(W / 2 + 92, H); c.fill();
      c.fillStyle = '#c02828'; c.fillRect(0, H - 18, W, 18);
      this.popups.forEach(p => R.text(p.text, p.x, p.y - (40 - p.t) * 0.8, { size: 16, align: 'center', weight: '800', color: '#ffe060' }));
      R.window(12, 10, 170, 40); R.text('SCORE', 22, 15, { size: 12, color: R.COL.cyan }); R.text(U.fmtNum(this.score), 170, 20, { size: 18, align: 'right' });
      R.bar(W - 170, 22, 150, 5, this.s / this.end, '#ff8060', '#ffe0a0');
      ui.readyGo(this.t, 180);
      if (this.over) ui.big('FINISH!', 180, '#ffe060', 44);
    }
    resultTitle(r) { return r.score >= 5000 ? 'EXCELLENT!' : r.score >= 3000 ? 'GREAT SHOOTING!' : 'NICE TRY!'; }
    resultRows(r) { return [['Targets hit', r.hits], ['Shots', r.shots], ['Score', U.fmtNum(r.score), '#ffe060']]; }
  }

  MG.register('shooting', {
    title: 'Speed Square Shooting Coaster',
    music: (o) => o.music || null,
    help: () => ({ title: 'SHOOTING COASTER', lines: ['Blast the targets with your laser as the coaster races along the track!', 'Every target is worth points. Score 3,000 for a prize, 5,000 for the grand prize.'], controls: [[['up', 'down', 'left', 'right'], 'Move the crosshair'], [['ok', '/', 'square'], 'Fire (hold for rapid fire)']] }),
    create: (opts) => new ShootGame(opts),
  });
})();
