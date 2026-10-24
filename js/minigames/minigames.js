// Minigames: registry + the shared minigame scene (how-to window -> play -> result -> retry), a
// virtual pad for the auto-play bot, a camera with its own projection (works headless), a 3D path
// helper (tracks / slopes / rails), fallback vehicle meshes and FF7-style HUD helpers.
//
//   FF7.minigames.start(id, opts) -> waitable { done, result: { won, score, ...extra } }
//   FF7.minigames.register(id, { title, music(opts), help(opts), create(opts, scene), retry(opts, result) })
//   A game object: update(I) / render() / bot() -> [buttons held] / idle() / done + result / resultRows()
//   Debug: index.html?minigame=<id>[&mode=gbike&variant=super_dunk&course=B&forced&final&bot]
//          index.html?minigame=menu  (list of every game)
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, V3 = FF7.V3;
  const MG = FF7.minigames;
  const W = FF7.W, H = FF7.H;
  MG.defs = MG.defs || {};
  MG.autoplay = typeof location !== 'undefined' && /[?&]bot\b/.test(location.search || '');

  // ids + titles (FF7.minigames.list); variants are extra entries for the debug menu
  MG.list = [
    { id: 'motorcycle', title: 'Motorcycle Chase' },
    { id: 'snowboard', title: 'Snowboarding' },
    { id: 'chocobo_race', title: 'Chocobo Racing' },
    { id: 'submarine', title: 'Submarine Battle' },
    { id: 'squats', title: 'Squat Contest' },
    { id: 'fort_condor', title: 'Fort Condor' },
    { id: 'dolphin', title: 'Mr. Dolphin' },
    { id: 'parade', title: 'Rufus’ Welcoming Parade' },
    { id: 'sendoff', title: 'The Send-off Ceremony' },
    { id: 'shinra_sneak', title: 'Shinra HQ 60F' },
    { id: 'cpr', title: 'CPR' },
    { id: 'train_escape', title: 'Runaway Train' },
    { id: 'parachute', title: 'Midgar Raid Skydive' },
    { id: 'shooting', title: 'Speed Square Shooting Coaster' },
    { id: 'darts', title: 'Darts / Super Dunk' },
    { id: 'wall_climb', title: 'Gaea’s Cliff' },
  ];
  MG.variants = [
    { id: 'motorcycle', title: 'G-Bike (Wonder Square)', opts: { mode: 'gbike' } },
    { id: 'snowboard', title: 'Snowboard A (Beginner)', opts: { mode: 'arcade', course: 'A' } },
    { id: 'snowboard', title: 'Snowboard B (Advanced)', opts: { mode: 'arcade', course: 'B' } },
    { id: 'snowboard', title: 'Snowboard C (Crazy)', opts: { mode: 'arcade', course: 'C' } },
    { id: 'chocobo_race', title: 'Chocobo Race (Corel Prison)', opts: { forced: true } },
    { id: 'chocobo_race', title: 'Chocobo Race (Class A, long)', opts: { rank: 'A', course: 'long' } },
    { id: 'submarine', title: 'Torpedo Attack Lv.1', opts: { mode: 'arcade', level: 1 } },
    { id: 'fort_condor', title: 'Fort Condor (Huge Materia)', opts: { final: true, gil: 20000 } },
    { id: 'darts', title: 'Super Dunk', opts: { variant: 'super_dunk' } },
  ];

  // default opts for debug launches (menu / ?minigame= / tools/sim.js) where the story would supply them
  MG.debugDefaults = { fort_condor: { gil: 6000 } };

  MG.register = function (id, def) {
    def.id = id;
    MG.defs[id] = def;
    const e = MG.list.find(x => x.id === id);
    if (e) { if (def.title) e.title = def.title; } else MG.list.push({ id, title: def.title || id });
    return def;
  };

  // ------------------------------------------------------------------ keys / button glyphs
  // the keyboard key of each button for the hints (the player's own bindings: Config > Controls)
  MG.KEYS = new Proxy({}, { get: (_, b) => typeof b === 'string' && FF7.input.keyLabel ? FF7.input.keyLabel(b) : '' });
  MG.GLYPH = { ok: '○', cancel: '✕', square: '□', menu: '△' };
  // a button's name in running text: the player's key for it (Config > Controls), or its pad button with a pad in
  // (the PlayStation symbols are only drawn as button icons, ui.glyph, next to the key)
  MG.btn = (b) => FF7.input.label ? FF7.input.label(b) : b;

  // ------------------------------------------------------------------ virtual pad (auto-play bot)
  const BUTTONS = ['up', 'down', 'left', 'right', 'ok', 'cancel', 'menu', 'square', 'l1', 'r1', 'l2', 'r2', 'start', 'select', 'run'];
  class Pad {
    constructor() { this.cur = {}; this.prev = {}; this.fr = {}; this.typed = []; }
    set(list) {
      this.prev = this.cur; this.cur = {};
      (list || []).forEach(b => { this.cur[b] = true; });
      for (const b of BUTTONS) this.fr[b] = this.cur[b] ? (this.fr[b] || 0) + 1 : 0;
    }
    held(b) { return !!this.cur[b]; }
    pressed(b) { return !!this.cur[b] && !this.prev[b]; }
    released(b) { return !this.cur[b] && !!this.prev[b]; }
    frames(b) { return this.fr[b] || 0; }
    repeat(b) { const f = this.frames(b); return f === 1 || (f > 16 && f % 4 === 0); }
    any() { return BUTTONS.some(b => this.pressed(b)); }
    consume() { }
    dir() { let x = 0, y = 0; if (this.cur.left) x--; if (this.cur.right) x++; if (this.cur.up) y--; if (this.cur.down) y++; return { x, y }; }
    back() { return this.pressed('cancel') || this.pressed('menu'); }
  }
  MG.Pad = Pad;

  // ------------------------------------------------------------------ camera with its own projection
  class Cam {
    constructor() {
      this.view = M4.create(); this.proj = M4.create(); this.vp = M4.create();
      this.eye = [0, 5, 10]; this.target = [0, 0, 0]; this.up = [0, 1, 0]; this.fov = 45; this.near = 0.1; this.far = 500;
    }
    set(eye, target, fov, near, far, up) {
      this.eye = eye; this.target = target;
      if (fov) this.fov = fov; if (near) this.near = near; if (far) this.far = far;
      this.up = up || [0, 1, 0];
      M4.lookAt(this.view, eye, target, this.up);
      M4.perspective(this.proj, this.fov * Math.PI / 180, W / H, this.near, this.far);
      M4.mul(this.vp, this.proj, this.view);
      return this;
    }
    apply() { GL.camera(this.eye, this.target, this.fov, this.near, this.far, this.up); return this; }
    project(p) {
      const vp = this.vp, x = p[0], y = p[1], z = p[2];
      const cx = vp[0] * x + vp[4] * y + vp[8] * z + vp[12];
      const cy = vp[1] * x + vp[5] * y + vp[9] * z + vp[13];
      const cw = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
      if (cw <= 0.0001) return { x: -9999, y: -9999, visible: false, depth: cw };
      return { x: (cx / cw * 0.5 + 0.5) * W, y: (1 - (cy / cw * 0.5 + 0.5)) * H, visible: true, depth: cw };
    }
    // world-space ray through a screen point (for aiming)
    ray(sx, sy) {
      const inv = M4.invert(M4.create(), this.vp);
      const nx = sx / W * 2 - 1, ny = 1 - sy / H * 2;
      const a = M4.transformPoint(inv, [nx, ny, -1]), b = M4.transformPoint(inv, [nx, ny, 1]);
      return { o: a.slice(0, 3), d: V3.norm(V3.sub(b.slice(0, 3), a.slice(0, 3))) };
    }
  }
  MG.Cam = Cam;

  // ------------------------------------------------------------------ mesh / model helpers
  const TMP = M4.create(), TMP2 = M4.create();
  // Meshes built while a game is being created are recorded and their GPU buffers released when the
  // game ends (module-level cached meshes just get re-uploaded on their next draw).
  MG.mesh = function (fn, opts) { const mb = new FF7.MeshBuilder(); fn(mb); const m = mb.build(opts); if (MG._scope) MG._scope.push(m); return m; };
  MG.releaseAll = function (list) { if (!list) return; for (const m of list) { try { GL.release(m); } catch (e) { } } list.length = 0; };
  MG.mat = function (pos, rot, scale) {
    const s = scale == null ? 1 : scale;
    return M4.trs(M4.create(), pos, rot || [0, 0, 0], typeof s === 'number' ? [s, s, s] : s);
  };
  // Draw a mesh at a position / euler rotation [rx, ry, rz] / uniform or [sx,sy,sz] scale.
  MG.put = function (mesh, pos, rot, scale, opts) {
    const s = scale == null ? 1 : scale;
    M4.trs(TMP, pos, rot || [0, 0, 0], typeof s === 'number' ? [s, s, s] : s);
    GL.draw(mesh, TMP, opts || undefined);
  };
  // Draw a mesh with an extra parent matrix
  MG.putIn = function (parent, mesh, pos, rot, scale, opts) {
    const s = scale == null ? 1 : scale;
    M4.trs(TMP2, pos, rot || [0, 0, 0], typeof s === 'number' ? [s, s, s] : s);
    M4.mul(TMP, parent, TMP2);
    GL.draw(mesh, TMP, opts || undefined);
  };
  MG.meshModel = function (mesh, height) {
    const m = new FF7.Model();
    m.bone('root', null, [0, 0, 0]);
    m.attach('root', mesh);
    m.height = height || (mesh.max ? mesh.max[1] : 1);
    m.anims = { idle: 'none' };
    m.showWeapon = () => {};
    return m;
  };
  // Bounding box of a model at identity transform (after its current pose).
  MG.bbox = function (m) {
    const sv = [m.position, m.rotX, m.rotY, m.rotZ, m.scale];
    m.position = [0, 0, 0]; m.rotX = m.rotY = m.rotZ = 0; m.scale = 1;
    m.computeWorld();
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const b of m.order) for (const a of b.meshes) {
      const me = a.mesh; if (!me || !me.min) continue;
      const mat = a.m ? M4.mul(M4.create(), b.world, a.m) : b.world;
      for (let i = 0; i < 8; i++) {
        const p = M4.transformPoint(mat, [i & 1 ? me.max[0] : me.min[0], i & 2 ? me.max[1] : me.min[1], i & 4 ? me.max[2] : me.min[2]]);
        for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
      }
    }
    [m.position, m.rotX, m.rotY, m.rotZ, m.scale] = sv;
    if (mn[0] > mx[0]) return { mn: [0, 0, 0], mx: [1, 1, 1] };
    return { mn, mx };
  };
  // Scale a model so its extent along 'length' (z) | 'height' (y) | 'width' (x) equals size.
  // Sets m.baseY so drawing at y = 0 puts the model's bottom on the ground.
  MG.fit = function (m, size, key) {
    const bb = MG.bbox(m);
    const k = key === 'height' ? 1 : key === 'width' ? 0 : 2;
    const ext = bb.mx[k] - bb.mn[k];
    m.scale = ext > 0.001 ? size / ext : 1;
    m.baseY = -bb.mn[1] * m.scale;
    m.fitCenterZ = -(bb.mn[2] + bb.mx[2]) / 2 * m.scale;
    m.centerY = -(bb.mn[1] + bb.mx[1]) / 2 * m.scale;      // add to y to centre the model on a point
    return m;
  };
  // Characters (FF7.chars3d) with a safe fallback.
  MG.char = function (app, opts = {}) {
    try {
      if (FF7.chars3d && FF7.chars3d.build) {
        const m = FF7.chars3d.build(app, { style: opts.style || 'field' });
        if (m) { if (m.showWeapon) m.showWeapon(!!opts.weapon); return m; }
      }
    } catch (e) { console.warn('minigame: character model failed', app, e && e.message); }
    const col = opts.color || '#5060a0';
    return MG.meshModel(MG.mesh(mb => {
      mb.box(0, 0.25, 0, 0.3, 0.5, 0.2, '#303040'); mb.box(0, 0.62, 0, 0.36, 0.36, 0.22, col);
      mb.sphere(0, 0.94, 0, 0.14, 0.15, 0.14, '#f0c8a0', 8, 6, true);
    }), 1.05);
  };
  // Enemy models (FF7.creatures) with fallback
  MG.creature = function (id, look) {
    try {
      const e = FF7.data.enemies[id];
      if (FF7.creatures && FF7.creatures.build) return FF7.creatures.build(look || (e && e.look) || { type: 'blob' }, id);
    } catch (e) { console.warn('minigame: creature model failed', id, e && e.message); }
    return MG.meshModel(MG.mesh(mb => mb.sphere(0, 0.5, 0, 0.5, 0.5, 0.5, '#80a060', 8, 6, true)), 1);
  };
  // Vehicles (js/gl/vehicles.js, written separately) with our own fallback builders.
  MG.vehicle = function (id, fallback, opts) {
    try {
      const V = FF7.vehicles3d;
      if (V && V.build && (!V.has || V.has(id))) { const m = V.build(id, opts || {}); if (m) { m.update && m.update(0); return m; } }
    } catch (e) { console.warn('minigame: vehicle model failed', id, e && e.message); }
    const fb = fallback || MG.fb[id];
    return fb ? fb(opts || {}) : MG.meshModel(MG.mesh(mb => mb.box(0, 0.5, 0, 1, 1, 2, '#808080')));
  };
  // Vehicle at a given scale: js/gl/vehicles.js models are in field units (a character is ~1.0 tall),
  // so they get the same scale as the characters riding them. Fallbacks are fitted to fbLength.
  MG.vehicleModel = function (id, scale, fbLength, fbOpts) {
    let m = null;
    try { const V = FF7.vehicles3d; if (V && V.build && V.has && V.has(id)) m = V.build(id); } catch (e) { console.warn('minigame: vehicle model failed', id, e && e.message); m = null; }
    if (m) { m.scale = scale; m.baseY = 0; m.native = true; if (m.play) m.play('move'); return m; }
    m = (MG.fb[id] || MG.fb.truck)(fbOpts || {});
    return MG.fit(m, fbLength || 2, 'length');
  };
  // World position of a named seat anchor (model units) of a model placed at pos with yaw
  MG.seat = function (m, name, pos, yaw, fallback) {
    const s = (m.seats && m.seats[name]) || fallback || [0, 0.5, 0];
    const k = m.scale || 1, x = s[0] * k, y = s[1] * k + (m.baseY || 0), z = s[2] * k;
    const c = Math.cos(yaw || 0), sn = Math.sin(yaw || 0);
    return [pos[0] + x * c + z * sn, pos[1] + y, pos[2] - x * sn + z * c];
  };
  // Draw a model at pos with a yaw (+ optional pitch / roll), keeping its fitted base on the ground.
  MG.drawModel = function (m, pos, yaw, pitch, roll, opts) {
    if (!m) return;
    m.position = [pos[0], pos[1] + (m.baseY || 0), pos[2]];
    m.rotY = yaw || 0; m.rotX = pitch || 0; m.rotZ = roll || 0;
    m.draw(opts);
  };

  // Shared small meshes
  MG.SHADOW = MG.mesh(mb => mb.prism(0, 0, 0, 1, 1, 0.001, 12, '#000000', false, true, false));
  MG.shadow = function (x, y, z, r, a) { MG.put(MG.SHADOW, [x, y + 0.02, z], null, [r, 1, r], { blend: 'alpha', tint: [1, 1, 1, a == null ? 0.35 : a], unlit: true }); };
  MG.BALL = MG.mesh(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#ffffff', 10, 7, true));
  MG.CUBE = MG.mesh(mb => mb.box(0, 0, 0, 1, 1, 1, '#ffffff'));
  MG.SPARK = MG.mesh(mb => { mb.sphere(0, 0, 0, 1, 1, 1, '#ffffff', 6, 4, false); }, { unlit: true });

  // Wheel along the x axis
  function wheel(mb, x, y, z, r, w, col) {
    mb.push(); mb.translate(x, y, z); mb.rotate(0, 0, Math.PI / 2);
    mb.prism(0, -w / 2, 0, r, r, w, 12, col || '#1c1c20', true);
    mb.prism(0, -w / 2 - 0.005, 0, r * 0.5, r * 0.5, w + 0.01, 8, '#9098a4', false);
    mb.pop();
  }
  MG.wheel = wheel;

  // ------------------------------------------------------------------ fallback vehicles (face +z)
  MG.fb = {
    motorcycle(o) {
      const c = o.color || '#2a3440', c2 = o.trim || '#b8c0c8';
      const m = MG.meshModel(MG.mesh(mb => {
        wheel(mb, 0, 0.34, 0.78, 0.34, 0.16); wheel(mb, 0, 0.36, -0.72, 0.36, 0.22);
        mb.frustum(0, 0.42, -0.1, 0.34, 1.1, 0.3, 0.9, 0.3, c);           // frame / engine block
        mb.box(0, 0.47, 0.0, 0.3, 0.2, 0.45, '#50565e');                   // engine
        mb.frustum(0, 0.72, 0.28, 0.38, 0.6, 0.28, 0.5, 0.16, c);          // tank
        mb.box(0, 0.78, -0.35, 0.3, 0.1, 0.62, '#18181c');                 // seat
        mb.box(0, 0.7, -0.78, 0.26, 0.12, 0.3, c);                         // tail
        mb.push(); mb.translate(0, 0.6, 0.72); mb.rotate(-0.35, 0, 0); mb.box(0.09, 0.2, 0, 0.04, 0.62, 0.05, c2); mb.box(-0.09, 0.2, 0, 0.04, 0.62, 0.05, c2); mb.pop();
        mb.frustum(0, 0.78, 0.82, 0.42, 0.3, 0.3, 0.2, 0.3, c);            // front cowl
        mb.box(0, 1.02, 0.66, 0.74, 0.04, 0.05, '#303030');                // handlebar
        mb.sphere(0, 0.9, 0.98, 0.09, 0.08, 0.06, '#fff4b0', 6, 4, true);  // headlight
        mb.box(0.2, 0.36, -0.55, 0.07, 0.07, 0.6, c2); mb.box(-0.2, 0.36, -0.55, 0.07, 0.07, 0.6, c2);  // exhausts
        mb.box(0, 0.74, -0.93, 0.2, 0.06, 0.03, '#ff3020');                // tail light
      }), 1.1);
      m.seats = { rider: [0, 0.83, -0.33] };
      return m;
    },
    truck(o) {
      const c = o.color || '#6a4a3a', dk = U.shade(c, -0.35);
      const m = MG.meshModel(MG.mesh(mb => {
        [1.55, -1.3].forEach(z => { wheel(mb, 1.02, 0.45, z, 0.45, 0.3); wheel(mb, -1.02, 0.45, z, 0.45, 0.3); });
        mb.box(0, 0.7, 0, 2.1, 0.35, 4.9, dk);                                    // chassis
        mb.frustum(0, 0.88, 1.55, 2.1, 1.7, 1.9, 1.1, 1.2, { top: c, front: '#8fb8d0', side: c, back: c }); // cab
        mb.box(0, 1.3, 2.43, 1.9, 0.45, 0.04, '#9cc8e0');                          // windshield
        mb.box(0, 0.95, 2.45, 2.1, 0.3, 0.08, '#303030');                          // grille
        mb.sphere(0.7, 0.98, 2.47, 0.12, 0.1, 0.05, '#fff4b0', 6, 4, true); mb.sphere(-0.7, 0.98, 2.47, 0.12, 0.1, 0.05, '#fff4b0', 6, 4, true);
        mb.box(0, 0.95, -0.95, 2.1, 0.12, 2.9, dk);                                // bed floor
        mb.box(1.02, 1.25, -0.95, 0.08, 0.5, 2.9, c); mb.box(-1.02, 1.25, -0.95, 0.08, 0.5, 2.9, c); mb.box(0, 1.25, -2.38, 2.1, 0.5, 0.08, c);
        mb.box(0, 1.25, 0.47, 2.1, 0.5, 0.08, c);
        mb.box(0.8, 0.9, -2.44, 0.2, 0.1, 0.04, '#ff3020'); mb.box(-0.8, 0.9, -2.44, 0.2, 0.1, 0.04, '#ff3020');
      }), 2.1);
      m.seats = { cargo: [0, 1.0, -0.95], driver: [0.5, 1.2, 1.5] };
      return m;
    },
    submarine(o) {
      const c = o.color || '#b02a20', dk = U.shade(c, -0.35);
      return MG.meshModel(MG.mesh(mb => {
        mb.push(); mb.rotate(Math.PI / 2, 0, 0);
        mb.loft([{ y: -4.2, rx: 0.1, rz: 0.1 }, { y: -3.6, rx: 0.7, rz: 0.7 }, { y: -2, rx: 1.1, rz: 1.1 }, { y: 2.2, rx: 1.1, rz: 1.1 }, { y: 3.6, rx: 0.8, rz: 0.8 }, { y: 4.3, rx: 0.2, rz: 0.2 }], { sides: 12, color: c });
        mb.pop();
        mb.frustum(0, 0.8, 0.6, 0.9, 2.0, 0.6, 1.4, 0.9, dk);                    // conning tower
        mb.box(0, 1.2, 0.6, 1.8, 0.08, 0.5, dk);                                  // tower fins
        mb.push(); mb.translate(0, 0, -3.7); mb.box(0, 0, 0, 2.6, 0.1, 0.6, dk); mb.box(0, 0, 0, 0.1, 2.2, 0.6, dk); mb.pop();
        mb.sphere(0, 0.25, 3.9, 0.2, 0.2, 0.2, '#ffe890', 6, 4, true);
        for (let i = 0; i < 4; i++) { mb.push(); mb.translate(0, 0, -4.25); mb.rotate(0, 0, i * Math.PI / 2 + 0.4); mb.box(0.35, 0, 0, 0.6, 0.12, 0.05, '#c0a040'); mb.pop(); }
      }), 2.2);
    },
    snowboard(o) {
      return MG.meshModel(MG.mesh(mb => {
        mb.push(); mb.translate(0, 0.03, 0); mb.rotate(Math.PI / 2, 0, 0);
        mb.loft([{ y: -0.78, rx: 0.06, rz: 0.02 }, { y: -0.7, rx: 0.15, rz: 0.025 }, { y: 0.7, rx: 0.15, rz: 0.025 }, { y: 0.78, rx: 0.06, rz: 0.02 }], { sides: 8, color: o.color || '#d03030' });
        mb.pop();
        mb.box(0, 0.06, 0.25, 0.22, 0.04, 0.12, '#202020'); mb.box(0, 0.06, -0.25, 0.22, 0.04, 0.12, '#202020');
      }), 0.1);
    },
    engine(o) {
      const c = o.color || '#303036';
      return MG.meshModel(MG.mesh(mb => {
        for (let i = 0; i < 3; i++) { wheel(mb, 0.8, 0.5, 2 - i * 1.4, 0.5, 0.18, '#202024'); wheel(mb, -0.8, 0.5, 2 - i * 1.4, 0.5, 0.18, '#202024'); }
        mb.box(0, 0.75, 0, 1.9, 0.3, 6.2, '#18181c');
        mb.push(); mb.translate(0, 1.7, 0.8); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -2.3, 0, 0.85, 0.85, 4.4, 12, c, true); mb.pop();
        mb.box(0, 1.95, -2.2, 2.0, 2.3, 1.8, U.shade(c, 0.15));                     // cab
        mb.box(0, 3.15, -2.2, 2.2, 0.12, 2.0, '#202024');
        mb.prism(0, 2.5, 2.4, 0.3, 0.38, 0.9, 8, '#202024');                         // chimney
        mb.frustum(0, 0.5, 3.3, 1.8, 0.3, 0.2, 0.9, 0.7, '#a02020');                 // cow-catcher
        mb.sphere(0, 1.9, 3.1, 0.3, 0.3, 0.12, '#fff4b0', 8, 4, true);
      }), 3.2);
    },
    wagon(o) {
      const c = o.color || '#5a4030';
      return MG.meshModel(MG.mesh(mb => {
        [1.6, -1.6].forEach(z => { wheel(mb, 0.8, 0.45, z, 0.45, 0.18); wheel(mb, -0.8, 0.45, z, 0.45, 0.18); });
        mb.box(0, 0.75, 0, 1.9, 0.3, 5.2, '#18181c');
        mb.box(0, 1.5, 0, 2.1, 1.2, 5.0, { top: '#101010', side: c });
        if (o.coal) mb.box(0, 2.12, 0, 1.9, 0.1, 4.8, '#1a1a1a');
      }), 2.2);
    },
  };

  // ------------------------------------------------------------------ 3D path helper
  // segs: [{ len, turn: total yaw change (radians, + = left), dy: height change, w: width }]
  // u = lateral offset (+ = right of travel), s = distance along the path.
  class Path {
    constructor(segs, opts = {}) {
      const step = this.step = opts.step || 1;
      let x = opts.x || 0, y = opts.y || 0, z = opts.z || 0, yaw = opts.yaw || 0;
      const X = [x], Y = [y], Z = [z], YAW = [yaw], PITCH = [0], WID = [(segs[0] && (segs[0].w0 || segs[0].w)) || opts.w || 10], SEG = [0];
      segs.forEach((sg, si) => {
        const n = Math.max(1, Math.round(sg.len / step));
        const dyaw = (sg.turn || 0) / n, dy = (sg.dy || 0) / n;
        const w0 = WID[WID.length - 1], w1 = sg.w || w0;
        for (let i = 0; i < n; i++) {
          yaw += dyaw;
          x += Math.sin(yaw) * step; z += Math.cos(yaw) * step; y += dy;
          X.push(x); Y.push(y); Z.push(z); YAW.push(yaw); PITCH.push(Math.atan2(-dy, step)); WID.push(w0 + (w1 - w0) * (i + 1) / n); SEG.push(si);
        }
      });
      Object.assign(this, { X, Y, Z, YAW, PITCH, WID, SEG, segs });
      this.length = (X.length - 1) * step;
      this.endYaw = yaw;
    }
    idx(s) { const f = U.clamp(s / this.step, 0, this.X.length - 1.0001); const i = Math.floor(f); return [i, f - i]; }
    at(s) {
      const [i, t] = this.idx(s);
      const L = (A) => A[i] + (A[i + 1] - A[i]) * t;
      const yaw = L(this.YAW);
      return { x: L(this.X), y: L(this.Y), z: L(this.Z), yaw, pitch: L(this.PITCH), w: L(this.WID), seg: this.SEG[i] };
    }
    right(yaw) { return [-Math.cos(yaw), 0, Math.sin(yaw)]; }
    pos(s, u, h) {
      const a = this.at(s);
      return [a.x - Math.cos(a.yaw) * (u || 0), a.y + (h || 0), a.z + Math.sin(a.yaw) * (u || 0)];
    }
    // Ribbon between lateral offsets u0..u1, from s0 to s1 (every `stride` samples). color: '#hex' | fn(s, uFrac, i) -> hex
    strip(mb, s0, s1, u0, u1, color, opts = {}) {
      const st = opts.stride || 1, nu = opts.nu || 1, lift = opts.lift || 0;
      const i0 = Math.max(0, Math.floor(s0 / this.step)), i1 = Math.min(this.X.length - 1, Math.ceil(s1 / this.step));
      const uf = (f, i) => typeof u0 === 'function' ? U.lerp(u0(i * this.step, this.WID[i]), u1(i * this.step, this.WID[i]), f) : U.lerp(u0, u1, f);
      const P = (i, f) => { const u = uf(f, i), yaw = this.YAW[i]; return [this.X[i] - Math.cos(yaw) * u, this.Y[i] + lift + (opts.bank ? opts.bank(i * this.step, f) : 0), this.Z[i] + Math.sin(yaw) * u]; };
      for (let i = i0; i < i1; i += st) {
        const j = Math.min(i1, i + st);
        for (let k = 0; k < nu; k++) {
          const f0 = k / nu, f1 = (k + 1) / nu;
          const col = typeof color === 'function' ? color(i * this.step, (k + 0.5) / nu, i) : color;
          // CCW seen from above: left edge is -u... quad (i,f0) (i,f1) (j,f1) (j,f0)
          const a = P(i, f0), b = P(i, f1), c = P(j, f1), d = P(j, f0);
          if (opts.flip) mb.quad(a, d, c, b, col); else mb.quad(a, b, c, d, col);
        }
      }
      return mb;
    }
    // Vertical wall along the path at lateral offset u (number | fn(s, width)), from h0 to h1 above the
    // centre line. Faces -u by default (inward for a right-hand wall); opts.facePlus faces +u (left walls).
    wall(mb, s0, s1, u, h0, h1, color, opts = {}) {
      const st = opts.stride || 2;
      const i0 = Math.max(0, Math.floor(s0 / this.step)), i1 = Math.min(this.X.length - 1, Math.ceil(s1 / this.step));
      const uu = (i) => typeof u === 'function' ? u(i * this.step, this.WID[i]) : u;
      const P = (i, h) => { const yaw = this.YAW[i], v = uu(i); return [this.X[i] - Math.cos(yaw) * v, this.Y[i] + h, this.Z[i] + Math.sin(yaw) * v]; };
      for (let i = i0; i < i1; i += st) {
        const j = Math.min(i1, i + st);
        const col = typeof color === 'function' ? color(i * this.step, i) : color;
        const a = P(i, h0), b = P(j, h0), c = P(j, h1), d = P(i, h1);
        if (opts.facePlus) mb.quad(a, b, c, d, col); else mb.quad(b, a, d, c, col);
      }
      return mb;
    }
    // Matrix placing an object at (s, u, h), yawed along the path (+extra yaw)
    matrix(s, u, h, extraYaw, scale, pitchFollow) {
      const a = this.at(s), p = this.pos(s, u, h);
      const sc = scale == null ? 1 : scale;
      return M4.trs(M4.create(), p, [pitchFollow ? a.pitch : 0, a.yaw + (extraYaw || 0), 0], typeof sc === 'number' ? [sc, sc, sc] : sc);
    }
  }
  MG.Path = Path;

  // ------------------------------------------------------------------ particles (additive sparks / puffs)
  class Particles {
    constructor() { this.list = []; }
    add(p, v, life, color, size, grav, blend) { this.list.push({ p: p.slice(), v: v.slice(), life, max: life, c: Array.isArray(color) ? color : MG.hexf(color), size: size || 0.15, g: grav == null ? 0.01 : grav, blend: blend || 'add' }); }
    burst(p, n, color, speed, life, size, grav, blend) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, e = Math.random() * 2 - 1, s = speed * (0.4 + Math.random() * 0.6);
        this.add(p, [Math.cos(a) * Math.sqrt(1 - e * e) * s, Math.abs(e) * s * 0.9 + s * 0.2, Math.sin(a) * Math.sqrt(1 - e * e) * s], life * (0.6 + Math.random() * 0.4), color, size, grav, blend);
      }
    }
    update() { this.list = this.list.filter(q => { q.p[0] += q.v[0]; q.p[1] += q.v[1]; q.p[2] += q.v[2]; q.v[1] -= q.g; return --q.life > 0; }); }
    draw(xf) {
      for (const q of this.list) {
        const k = q.life / q.max;
        MG.put(MG.SPARK, xf ? xf(q.p) : q.p, null, q.size * (0.4 + 0.6 * k), { unlit: true, blend: q.blend, tint: [q.c[0], q.c[1], q.c[2], q.blend === 'add' ? k : k * 0.8] });
      }
    }
  }
  MG.Particles = Particles;

  // ------------------------------------------------------------------ 2D HUD helpers
  const ui = MG.ui = {};
  const GLYPH_COL = { ok: '#ff6868', cancel: '#78b0ff', square: '#ff90e0', menu: '#58e0a8' };
  // Draw a PlayStation button glyph centred at (x, y); returns width used.
  ui.glyph = function (b, x, y, s = 16) {
    const c = R.ctx, r = s / 2;
    c.save();
    c.lineWidth = Math.max(1.5, s / 8); c.lineJoin = 'round';
    if (GLYPH_COL[b]) {
      c.fillStyle = 'rgba(20,20,30,0.85)'; c.beginPath(); c.arc(x, y, r + 1, 0, Math.PI * 2); c.fill();
      c.strokeStyle = GLYPH_COL[b]; c.beginPath();
      const k = r * 0.52;
      if (b === 'ok') c.arc(x, y, k, 0, Math.PI * 2);
      else if (b === 'cancel') { c.moveTo(x - k, y - k); c.lineTo(x + k, y + k); c.moveTo(x + k, y - k); c.lineTo(x - k, y + k); }
      else if (b === 'square') c.rect(x - k, y - k, k * 2, k * 2);
      else if (b === 'menu') { c.moveTo(x, y - k * 1.1); c.lineTo(x + k * 1.05, y + k * 0.8); c.lineTo(x - k * 1.05, y + k * 0.8); c.closePath(); }
      c.stroke(); c.restore(); return s + 2;
    }
    if (['up', 'down', 'left', 'right'].includes(b)) {
      c.fillStyle = 'rgba(20,20,30,0.85)'; R.roundRect(c, x - r, y - r, s, s, 3); c.fill();
      c.fillStyle = '#e8e8f0'; c.beginPath();
      const k = r * 0.55, rot = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }[b];
      const pt = (dx, dy) => [x + dx * Math.cos(rot) - dy * Math.sin(rot), y + dx * Math.sin(rot) + dy * Math.cos(rot)];
      const p1 = pt(0, -k), p2 = pt(k, k * 0.7), p3 = pt(-k, k * 0.7);
      c.moveTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.lineTo(p3[0], p3[1]); c.closePath(); c.fill();
      c.restore(); return s + 2;
    }
    const label = { l1: 'L1', r1: 'R1', l2: 'L2', r2: 'R2', start: 'START', select: 'SELECT' }[b] || String(b).toUpperCase();
    const w = Math.max(s + 6, R.measure(label, s * 0.62, '700') + 10);
    c.fillStyle = 'rgba(20,20,30,0.85)'; R.roundRect(c, x - r, y - r, w, s, 4); c.fill();
    c.strokeStyle = '#a0a0b8'; c.lineWidth = 1; R.roundRect(c, x - r + 0.5, y - r + 0.5, w - 1, s - 1, 4); c.stroke();
    c.restore();
    R.text(label, x - r + w / 2, y - s * 0.36, { size: s * 0.62, weight: '700', align: 'center', shadow: false, color: '#e8e8f0' });
    return w + 2;
  };
  // Draw a list of buttons ('+' joins them) followed by a keyboard hint; returns total width
  ui.keys = function (keys, x, y, s = 16) {
    let cx = x + s / 2;
    const list = Array.isArray(keys) ? keys : [keys];
    const hints = [];
    list.forEach((k, i) => {
      if (k === '/' || k === '+') { R.text(k, cx - 4, y - 9, { size: 14, color: R.COL.gray }); cx += 12; return; }
      cx += ui.glyph(k, cx, y, s);
      if (MG.KEYS[k] && !['up', 'down', 'left', 'right'].includes(k)) hints.push(MG.KEYS[k]);
    });
    if (hints.length) { R.text('[' + hints.join(',') + ']', cx - s / 2 + 2, y - 7, { size: 11, color: '#9098b0', shadow: false }); cx += R.measure('[' + hints.join(',') + ']', 11) + 4; }
    return cx - x;
  };
  ui.center = function (text, y, size = 17, color, opts = {}) { R.text(text, W / 2, y, Object.assign({ align: 'center', size, color }, opts)); };
  // Big outlined announcement ("READY", "GO!", "GOAL!")
  ui.big = function (text, y, color = '#ffffff', size = 44, alpha = 1) {
    const c = R.ctx;
    c.save(); c.globalAlpha = alpha;
    c.font = R.font(size, '800'); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 6; c.strokeStyle = 'rgba(10,10,40,0.9)'; c.strokeText(text, W / 2, y);
    c.fillStyle = color; c.fillText(text, W / 2, y);
    c.restore(); c.textAlign = 'left';
  };
  // Labelled gauge in a small window
  ui.gauge = function (label, x, y, w, frac, c1, c2, value) {
    R.window(x, y, w, 40);
    R.text(label, x + 10, y + 5, { size: 12, color: R.COL.cyan });
    if (value != null) R.text(value, x + w - 10, y + 4, { size: 13, align: 'right' });
    R.bar(x + 10, y + 24, w - 20, 8, frac, c1, c2);
  };
  ui.panel = function (x, y, w, h, rows, opts = {}) {
    R.window(x, y, w, h, opts);
    rows.forEach((r, i) => {
      if (!r) return;
      const yy = y + 8 + i * (opts.lh || 20);
      if (Array.isArray(r)) { R.text(r[0], x + 12, yy, { size: opts.size || 14, color: R.COL.cyan }); R.text(String(r[1]), x + w - 12, yy, { size: opts.size || 14, align: 'right', color: r[2] }); }
      else R.text(r, x + 12, yy, { size: opts.size || 14 });
    });
  };
  // "READY" (frames 0-59) then "GO!" (60-95). Returns true when control starts.
  MG.READY = 60;
  ui.readyGo = function (t, y = 200) {
    if (t < MG.READY) ui.big('READY', y, '#ffe060', 44, Math.min(1, t / 10));
    else if (t < MG.READY + 36) ui.big('GO!', y, '#80ff90', 52, 1 - (t - MG.READY) / 36);
  };
  MG.fmtTime = function (frames) {
    const s = Math.max(0, frames) / 60, m = Math.floor(s / 60), ss = Math.floor(s % 60), cs = Math.floor((s * 100) % 100);
    return `${m}'${U.pad(ss, 2, '0')}"${U.pad(cs, 2, '0')}`;
  };
  MG.fmtClock = function (frames) { const s = Math.ceil(Math.max(0, frames) / 60); return `${Math.floor(s / 60)}:${U.pad(s % 60, 2, '0')}`; };
  MG.sky = function (top, bottom, mid) {
    const c = R.ctx, g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); if (mid) g.addColorStop(0.55, mid); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  };
  MG.hexf = function (hex) { const [r, g, b] = U.hexToRgb(hex); return [r / 255, g / 255, b / 255]; };
  MG.sfx = function (id, v) { try { FF7.audio.sfx(id, v); } catch (e) { } };
  // Seeded random for repeatable course layouts
  MG.rng = (seed) => U.rng(typeof seed === 'string' ? U.strSeed(seed) : seed);
  // Records (best scores) kept in the save file
  MG.record = function (key, value, better) {
    const st = FF7.state; if (!st || !st.vars) return value;
    const k = 'mg_best_' + key, old = st.vars[k];
    if (old == null || (better === 'low' ? value < old : value > old)) st.vars[k] = value;
    return st.vars[k];
  };
  MG.best = function (key) { const st = FF7.state; return st && st.vars ? st.vars['mg_best_' + key] : null; };

  // ------------------------------------------------------------------ the minigame scene
  function normHelp(h) {
    if (!h) return { title: '', lines: [], controls: [] };
    if (typeof h === 'string') return { title: '', lines: [h], controls: [] };
    return { title: h.title || '', lines: [].concat(h.lines || h.text || []), controls: h.controls || [] };
  }
  function normResult(r) {
    if (r == null || typeof r !== 'object') r = { won: !!r, score: typeof r === 'number' ? r : 0 };
    r = Object.assign({}, r);
    r.won = !!r.won;
    r.score = typeof r.score === 'number' && isFinite(r.score) ? r.score : 0;
    return r;
  }

  class MinigameScene {
    constructor(def, opts, waiter) {
      this.def = def; this.opts = opts; this.waiter = waiter;
      this.isMinigame = true;
      this.phase = 'launch'; this.t = 0; this.pt = 0;
      this.transparent = true;
      this.bot = MG.autoplay || !!opts.autoplay;
      this.I = this.bot ? new Pad() : FF7.input;
      this.tries = 0; this.result = null; this.paused = false; this.choice = 0;
    }
    enter() { this.fade = FF7.sceneMgr.fadeOut(14); }
    setPhase(p) { this.phase = p; this.pt = 0; }
    newGame() {
      this.tries++;
      this.disposeGame();
      MG._scope = [];
      try { this.game = this.def.create(this.opts, this); }
      finally { this.meshes = MG._scope; MG._scope = null; }
      this.game.t = this.game.t || 0;
    }
    disposeGame() {
      try { if (this.game && this.game.dispose) this.game.dispose(); } catch (e) { }
      MG.releaseAll(this.meshes);
    }
    startMusic() {
      const mus = this.opts.music !== undefined ? this.opts.music : (typeof this.def.music === 'function' ? this.def.music(this.opts) : this.def.music);
      this.musicPushed = false;
      if (mus && mus !== 'keep' && mus !== FF7.audio.currentId) { FF7.audio.push(mus); this.musicPushed = true; }
    }
    update(canInput) {
      this.t++; this.pt++;
      if (this.bot) this.I.set(this.botInput());
      try { this.step(); }
      catch (e) { console.error('Minigame error (' + this.def.id + ')', e); this.fail(e); }
    }
    step() {
      const I = this.I, S = FF7.sceneMgr;
      switch (this.phase) {
        case 'launch':
          if (!this.fade.done) return;
          this.transparent = false;
          this.startMusic();
          this.newGame();
          S.fadeIn(20);
          this.setPhase(this.opts.noHelp ? 'play' : 'help');
          if (this.phase === 'play' && this.game.begin) this.game.begin();
          return;
        case 'help':
          if (this.game.idle) this.game.idle();
          if (this.pt > 20 && (I.pressed('ok') || I.pressed('start'))) {
            MG.sfx('confirm');
            this.setPhase('play');
            if (this.game.begin) this.game.begin();
          }
          return;
        case 'play':
          if (I.pressed('start') && this.def.pause !== false && !this.game.noPause) { this.paused = !this.paused; MG.sfx('cursor'); }
          if (this.paused) { if (I.pressed('select') && this.def.quit) { this.paused = false; this.game.done = true; this.game.result = Object.assign({ won: false, score: 0, quit: true }, this.game.quitResult ? this.game.quitResult() : {}); } else return; }
          this.game.update(I);
          if (this.game.done) {
            this.result = normResult(this.game.result);
            this.setPhase('result');
            MG.sfx(this.result.won ? 'item' : 'cancel');
          }
          return;
        case 'result':
          if (this.game.idle) this.game.idle();
          if (this.pt > 40 && I.pressed('ok')) {
            MG.sfx('confirm');
            const mode = this.retryMode();
            if (mode === 'auto') this.restart();
            else if (mode === 'ask') { this.choice = 0; this.setPhase('ask'); }
            else this.exit();
          }
          return;
        case 'ask':
          if (this.game.idle) this.game.idle();
          if (I.repeat('up') || I.repeat('down')) { this.choice = 1 - this.choice; MG.sfx('cursor'); }
          if (this.pt > 10 && I.pressed('ok')) { MG.sfx('confirm'); if (this.choice === 0) this.restart(); else this.exit(); }
          else if (this.pt > 10 && I.pressed('cancel')) { MG.sfx('cancel'); this.exit(); }
          return;
        case 'exit':
          if (this.game && this.game.idle) this.game.idle();
          if (this.fade.done && !this.popped) this.finish();
          return;
      }
    }
    retryMode() {
      if (this.result.won || this.result.error) return null;
      if (this.def.retry) return this.def.retry(this.opts, this.result, this.tries);
      if (this.opts.retry === 'auto') return 'auto';
      if (this.opts.retry) return 'ask';
      return null;
    }
    restart() {
      this.newGame();
      this.setPhase('play');
      if (this.game.begin) this.game.begin();
    }
    exit() {
      if (this.phase === 'exit') return;
      this.setPhase('exit');
      this.fade = FF7.sceneMgr.fadeOut(20);
    }
    fail(e) {
      if (this.phase === 'exit' || this.popped) { if (!this.popped) this.finish(); return; }
      this.result = normResult({ won: true, score: 0, error: String(e && e.message || e) });
      this.game = this.game || { render() { R.clear(); } };
      this.game.done = true;
      this.errored = true;
      this.exit();
    }
    finish() {
      this.popped = true;
      this.disposeGame();
      if (this.musicPushed) FF7.audio.pop(30);
      FF7.sceneMgr.pop();
      FF7.sceneMgr.fadeIn(20);
      const r = this.result || normResult({ won: false, score: 0 });
      r.tries = this.tries;
      if (!r.error) MG.record(this.def.id + (this.opts.mode ? '_' + this.opts.mode : '') + (this.opts.course ? '_' + this.opts.course : ''), r.score);
      MG.last = { id: this.def.id, opts: this.opts, result: r };
      this.waiter.result = r; this.waiter.done = true;
    }
    botInput() {
      const pt = this.pt;
      switch (this.phase) {
        case 'help': case 'result': return pt > 44 && pt % 6 === 0 ? ['ok'] : [];
        case 'ask': return pt === 4 && !this.botRetry ? ['down'] : pt > 14 && pt % 6 === 0 ? ['ok'] : [];
        case 'play': return this.game && this.game.bot ? (this.game.bot() || []) : [];
      }
      return [];
    }

    // ---------------------------------------------------------------- render
    render() {
      if (this.phase === 'launch' || !this.game) return;
      try { this.game.render(); }
      catch (e) { if (!this.renderErr) { this.renderErr = true; console.error('Minigame render error (' + this.def.id + ')', e); this.fail(e); } R.clear(); }
      R.reset();
      if (this.phase === 'help') this.drawHelp();
      else if (this.phase === 'result' || this.phase === 'ask') this.drawResult();
      if (this.phase === 'ask') this.drawAsk();
      if (this.paused) {
        R.fill('#000', 0.45);
        R.window(W / 2 - 110, 190, 220, this.def.quit ? 80 : 56);
        ui.center('PAUSE', 204, 22);
        if (this.def.quit) { R.text('Quit', W / 2 - 70 + ui.keys(['select'], W / 2 - 70, 250, 16) + 4, 241, { size: 14 }); }
      }
      if (this.bot) R.text('AUTO', W - 8, H - 18, { size: 11, align: 'right', color: '#ffd060' });
    }
    drawHelp() {
      const h = this.help || (this.help = normHelp(typeof this.def.help === 'function' ? this.def.help(this.opts) : this.def.help));
      const w = 540, x = (W - w) / 2;
      const lines = [];
      h.lines.forEach(l => R.wrap(l, w - 40, 15).forEach(t => lines.push(t)));
      const hh = 22 + lines.length * 20 + (h.controls.length ? 16 + h.controls.length * 24 : 0) + 36;
      const y = Math.max(52, Math.round((H - hh) / 2) + 14);
      const a = Math.min(1, this.pt / 10);
      R.fill('#000', 0.3 * a);
      const title = h.title || this.def.title || '';
      const tw = Math.max(200, R.measure(title, 18, '700') + 50);
      R.window((W - tw) / 2, y - 44, tw, 38, { alpha: a });
      R.text(title, W / 2, y - 35, { align: 'center', size: 18, weight: '700' });
      R.window(x, y, w, hh, { alpha: a });
      let yy = y + 14;
      lines.forEach(l => { R.text(l, x + 20, yy, { size: 15 }); yy += 20; });
      if (h.controls.length) {
        yy += 8;
        R.ctx.fillStyle = 'rgba(160,170,220,0.35)'; R.ctx.fillRect(x + 16, yy - 4, w - 32, 1);
        yy += 6;
        h.controls.forEach(cr => {
          const kw = ui.keys(cr[0], x + 26, yy + 9, 16);
          R.text(cr[1], x + 34 + Math.max(kw, 118), yy, { size: 14, color: '#e0e4f0' });
          yy += 24;
        });
      }
      if (this.pt > 20 && (this.t >> 4) % 2 === 0) { R.text('Start', x + w - 120 + ui.keys(['ok'], x + w - 120, y + hh - 18, 16) + 4, y + hh - 27, { size: 14 }); }
    }
    drawResult() {
      const g = this.game, r = this.result || {};
      const rows = (g.resultRows ? g.resultRows(r) : null) || [['Score', U.fmtNum(r.score)]];
      const head = g.resultTitle ? g.resultTitle(r) : (r.won ? 'CLEAR!' : 'FAILED');
      const w = 360, h = 70 + rows.length * 24 + 26, x = (W - w) / 2, y = Math.max(40, (H - h) / 2 - 10);
      R.fill('#000', Math.min(0.35, this.pt / 40));
      R.window(x, y, w, h);
      ui.center(head, y + 12, 24, r.won ? '#ffe060' : '#ff8080', { weight: '800' });
      rows.forEach((rw, i) => {
        const yy = y + 52 + i * 24;
        R.text(rw[0], x + 24, yy, { size: 15, color: R.COL.cyan });
        R.text(String(rw[1]), x + w - 24, yy, { size: 15, align: 'right', color: rw[2] || R.COL.white });
      });
      if (this.pt > 40 && (this.t >> 4) % 2 === 0 && this.phase === 'result') { ui.keys(['ok'], x + w - 70, y + h - 16, 14); }
    }
    drawAsk() {
      const w = 220, x = (W - w) / 2, y = 360;
      R.window(x, y, w, 76);
      R.text('Try again?', x + 20, y + 10, { size: 15, color: R.COL.cyan });
      ['Yes', 'No'].forEach((s, i) => R.text(s, x + 70, y + 32 + i * 20, { size: 15 }));
      R.cursor(x + 62, y + 42 + this.choice * 20);
    }
  }
  MG.MinigameScene = MinigameScene;

  // ------------------------------------------------------------------ public entry
  MG.start = function (id, opts) {
    opts = opts || {};
    const w = { done: false, result: null };
    const def = MG.defs[id];
    if (!def) { w.done = true; w.result = { won: true, score: 0, skipped: true }; return w; }
    FF7.sceneMgr.push(new MinigameScene(def, opts, w));
    return w;
  };
  MG.has = (id) => !!MG.defs[id];

  // ------------------------------------------------------------------ debug hook (?minigame=<id>)
  class MenuScene {
    constructor() { this.idx = 0; this.entries = MG.list.map(e => ({ id: e.id, title: e.title, opts: Object.assign({}, MG.debugDefaults[e.id]) })).concat(MG.variants); this.waiter = null; this.t = 0; }
    update() {
      this.t++;
      const I = FF7.input;
      if (this.waiter) { if (this.waiter.done) { this.lastResult = this.waiter.result; this.waiter = null; } return; }
      if (I.repeat('up')) { this.idx = (this.idx + this.entries.length - 1) % this.entries.length; MG.sfx('cursor'); }
      if (I.repeat('down')) { this.idx = (this.idx + 1) % this.entries.length; MG.sfx('cursor'); }
      if (I.pressed('ok')) { const e = this.entries[this.idx]; MG.sfx('confirm'); this.lastResult = null; this.waiter = MG.start(e.id, Object.assign({}, e.opts)); }
      if (I.back()) { FF7.sceneMgr.pop(); }
    }
    render() {
      R.clear();
      MG.sky('#101838', '#000010');
      R.window(40, 16, 560, 40); ui.center('MINIGAMES', 24, 20);
      const top = Math.max(0, Math.min(this.idx - 7, this.entries.length - 16));
      R.window(40, 62, 360, 400);
      for (let i = top; i < Math.min(this.entries.length, top + 16); i++) {
        const y = 74 + (i - top) * 24;
        R.text(this.entries[i].title, 76, y, { size: 15, color: MG.defs[this.entries[i].id] ? R.COL.white : R.COL.gray });
        if (i === this.idx) R.cursor(70, y + 10);
      }
      R.window(408, 62, 192, 400);
      R.text('Last result', 420, 72, { size: 13, color: R.COL.cyan });
      if (this.lastResult) Object.keys(this.lastResult).slice(0, 14).forEach((k, i) => { const v = this.lastResult[k]; R.text(k, 420, 96 + i * 20, { size: 12, color: R.COL.cyan }); R.text(typeof v === 'object' ? JSON.stringify(v).slice(0, 14) : String(v), 588, 96 + i * 20, { size: 12, align: 'right' }); });
      R.text(MG.autoplay ? 'Bot: ON (?bot)' : 'Add &bot for auto-play', 420, 438, { size: 11, color: R.COL.gray });
    }
  }
  MG.debugStart = function (id, q) {
    const get = (k) => q && q.get ? q.get(k) : null;
    const has = (k) => q && q.has ? q.has(k) : false;
    if (has('bot')) MG.autoplay = true;
    if (!id || id === 'menu' || id === 'list' || !MG.defs[id]) { FF7.sceneMgr.push(new MenuScene()); return null; }
    const opts = Object.assign({}, MG.debugDefaults[id]);
    ['mode', 'variant', 'course', 'level', 'battle', 'rank', 'title', 'route'].forEach(k => { const v = get(k); if (v != null && v !== '') opts[k] = isNaN(+v) ? v : +v; });
    ['forced', 'final', 'retry'].forEach(k => { if (has(k)) opts[k] = true; });
    if (get('gil')) opts.gil = +get('gil');
    return MG.start(id, opts);
  };
})();
