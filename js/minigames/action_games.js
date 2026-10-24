// Timing / action minigames:
//   train_escape  Corel: pump the levers (↑ and △ alternately) to catch the runaway train, then pull
//                 the brakes (↑+△, ↓+✕, ↓+✕) before it smashes into North Corel.
//                 opts.phase 'chase' | 'stop' | both.  Result { won: stopped, caught, stopped, score: metres to spare }
//   parachute     Midgar raid: steer the fall onto the landing zone, ○ opens the chute, □ somersault.
//                 Result { won, score (0-100), dist }
//   darts         opts.variant 'super_dunk': Wonder Square basketball, hold ○ and release at the right
//                 power; shoot until you miss, Double Chance every 10 baskets (FF7 GP rules, max 300).
//                 Result { won, score: GP, hits }.  Otherwise a game of darts (9 darts) -> { won, score }
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, V3 = FF7.V3, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;

  // ================================================================== RUNAWAY TRAIN
  const TRAIN_LEN = 1500;           // metres from the start to North Corel
  class TrainGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.phase = opts.phase === 'stop' ? 'stop' : 'chase';
      this.runaway = { s: this.phase === 'stop' ? 420 : 150, v: 0.42 };
      this.me = { s: this.phase === 'stop' ? 400 : 0, v: 0.3 };
      this.last = null; this.pumps = 0; this.lever = 0;
      this.combo = [['up', 'menu'], ['down', 'cancel'], ['down', 'cancel']]; this.ci = 0; this.brake = 0;
      const segs = [];
      const rnd = MG.rng('corel-rails');
      for (let s = 0; s < TRAIN_LEN + 200; s += 120) segs.push({ len: 120, turn: (rnd() - 0.5) * 0.9, dy: (rnd() - 0.5) * 6 });
      this.path = new MG.Path(segs, { w: 3 });
      this.engine = MG.vehicleModel('train_engine', 1.4, 7, { color: '#2a2a30' });
      this.runEngine = MG.vehicleModel('train_engine', 1.4, 7, { color: '#3a2420' });
      this.wagon = MG.vehicleModel('train_wagon', 1.4, 5.4, { color: '#5a4030', coal: true });
      if (!this.engine.native && MG.fb.engine) { this.engine = MG.fit(MG.fb.engine({ color: '#2a2a30' }), 7, 'length'); this.runEngine = MG.fit(MG.fb.engine({ color: '#4a2a20' }), 7, 'length'); }
      if (!this.wagon.native) this.wagon = MG.fit(MG.fb.wagon({ color: '#5a4030', coal: true }), 5.4, 'length');
      this.mesh = MG.mesh(mb => {
        const p = this.path, L = p.length;
        p.strip(mb, 0, L, -60, 60, (s, f, i) => (i >> 3) % 2 ? '#b8885a' : '#b08050', { stride: 6, nu: 4, lift: -0.3 });
        p.strip(mb, 0, L, -1.9, 1.9, '#7a6a58', { stride: 3, lift: -0.2 });
        p.strip(mb, 0, L, -0.8, -0.68, '#a0a0a8', { stride: 3, lift: 0.1 }); p.strip(mb, 0, L, 0.68, 0.8, '#a0a0a8', { stride: 3, lift: 0.1 });
        for (let s = 0; s < L; s += 1.2) { const a = p.at(s), q = p.pos(s, 0, -0.05); mb.push(); mb.translate(q[0], q[1], q[2]); mb.rotate(0, a.yaw, 0); mb.box(0, 0, 0, 2.3, 0.12, 0.3, '#4a3424'); mb.pop(); }
        for (let s = 0; s < L; s += 25) { const q = p.pos(s, 4, 0); mb.box(q[0], q[1] + 2.5, q[2], 0.15, 5, 0.15, '#5a4030'); mb.box(q[0], q[1] + 4.8, q[2], 1.2, 0.1, 0.1, '#5a4030'); }
        for (let s = 0; s < L; s += 7) [-1, 1].forEach(sd => { if (rnd() < 0.4) return; const q = p.pos(s, sd * (12 + rnd() * 30), 0); mb.prism(q[0], q[1] - 0.5, q[2], 3 + rnd() * 6, 1 + rnd() * 3, 6 + rnd() * 22, 6, U.mix('#a06a40', '#c89060', rnd())); });
        // North Corel: a few shacks at the end of the line
        for (let i = 0; i < 10; i++) { const q = this.path.pos(TRAIN_LEN + 20 + (i % 5) * 8, (i < 5 ? -1 : 1) * (6 + (i % 3) * 3), 0); mb.box(q[0], q[1] + 1.5, q[2], 4, 3, 4, U.mix('#8a7058', '#6a5848', (i * 37 % 10) / 10)); mb.frustum(q[0], q[1] + 3, q[2], 4.4, 4.4, 1, 4.4, 1.2, '#5a4030'); }
        const q = this.path.pos(TRAIN_LEN + 6, 0, 0); mb.box(q[0], q[1] + 1, q[2], 5, 2, 1, '#806040');
      });
    }
    update(I) {
      this.t++; this.fx.update();
      const me = this.me, rw = this.runaway;
      if (this.over) { if (++this.over > 120) { const spare = Math.max(0, Math.round(TRAIN_LEN - rw.s)); this.result = { won: !!this.stopped, caught: !!this.caught, stopped: !!this.stopped, score: this.stopped ? spare : 0 }; this.done = true; } me.s += me.v; rw.s += rw.v; me.v *= 0.97; rw.v *= this.stopped ? 0.95 : 1; return; }
      const go = this.t >= MG.READY;
      rw.v = Math.min(0.62, rw.v + 0.00006);
      if (this.phase === 'stop' && this.brake) rw.v = Math.max(0, rw.v - 0.004 * this.brake);
      rw.s += go ? rw.v : 0;
      if (this.lever > 0) this.lever--;
      if (this.phase === 'chase') {
        if (go) {
          const b = I.pressed('up') ? 'up' : I.pressed('menu') ? 'menu' : null;
          if (b) {
            if (b !== this.last) { me.v += 0.017; this.pumps++; this.lever = 10; this.leverSide = b === 'up' ? -1 : 1; MG.sfx('cursor', 0.4); }
            else me.v -= 0.01;
            this.last = b;
          }
          me.v = U.clamp(me.v * 0.9975, 0.2, 0.95);
          me.s += me.v;
          if (this.t % 5 === 0) this.fx.add(this.path.pos(me.s + 2, 0, 5), [(Math.random() - 0.5) * 0.04, 0.08, 0], 50, '#404040', 0.9, -0.001, 'alpha');
        }
        if (rw.s - me.s <= 9) { this.caught = true; this.phase = 'stop'; this.ptStop = 0; MG.sfx('confirm'); this.msg = { text: 'Caught up! Now stop the train!', t: 120 }; me.s = rw.s - 9; }
      } else {
        me.v = rw.v; me.s = rw.s - 9;
        // brake combos: both buttons of the combo held, one of them just pressed
        const c = this.combo[this.ci];
        if (c && go && I.held(c[0]) && I.held(c[1]) && (I.pressed(c[0]) || I.pressed(c[1]))) { this.ci++; this.lever = 16; this.leverSide = this.ci % 2 ? 1 : -1; MG.sfx('gate', 0.6); FF7.sceneMgr.doShake(3, 10); this.brake = this.ci; if (this.ci >= this.combo.length) { this.brake = 4; this.msg = { text: 'The brakes are on!', t: 120 }; } }
        if (this.brake >= 4 && rw.v <= 0.02) { this.stopped = true; this.over = 1; MG.sfx('item'); }
        if (this.brake && this.t % 3 === 0) this.fx.add(this.path.pos(rw.s - 2, (Math.random() < 0.5 ? -1 : 1) * 0.8, 0.2), [(Math.random() - 0.5) * 0.1, 0.08, 0], 18, '#ffc040', 0.12, 0.006);
      }
      if (this.msg && --this.msg.t <= 0) this.msg = null;
      if (rw.s >= TRAIN_LEN && !this.over) { this.over = 1; this.crash = true; MG.sfx('fire2'); FF7.sceneMgr.doShake(8, 40); FF7.sceneMgr.doFlash('#ffffff', 20, 0.8); this.fx.burst(this.path.pos(TRAIN_LEN, 0, 2), 40, '#ff8020', 0.5, 40, 1.4, 0.004); }
    }
    bot() {
      if (this.t < MG.READY || this.over) return [];
      if (this.phase === 'chase') return this.t % 9 === 0 ? [this.last === 'up' ? 'menu' : 'up'] : [];
      const c = this.combo[this.ci];
      if (!c) return [];
      return this.t % 10 < 5 ? [] : c.slice();
    }
    debugLog() { return `phase=${this.phase} me=${this.me.s.toFixed(0)} v=${this.me.v.toFixed(2)} run=${this.runaway.s.toFixed(0)} ci=${this.ci}`; }
    drawTrain(eng, s, wagons, roll) {
      const p = this.path;
      const place = (m, ss) => { const a = p.at(ss), q = p.pos(ss, 0, 0); m.update && m.update(); MG.drawModel(m, q, a.yaw, 0, roll || 0); };
      place(eng, s);
      for (let i = 1; i <= wagons; i++) place(this.wagon, s - i * 6.2);
    }
    render() {
      MG.sky('#4a88d0', '#f0d8a0');
      const p = this.path, me = this.me, rw = this.runaway;
      const back = p.pos(Math.max(0, me.s - 14), 1.5, 6.5), tgt = p.pos(me.s + 12, 0, 2);
      this.cam.set(back, tgt, 55, 0.3, 400);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.94, 0.86, 0.7], near: 80, far: 260 }, light: { dir: [-0.4, -0.8, -0.3], color: [0.78, 0.72, 0.62], ambient: [0.48, 0.46, 0.46] } });
      this.cam.apply();
      GL.draw(this.mesh, null);
      this.drawTrain(this.runEngine, rw.s, 3, 0);
      this.drawTrain(this.engine, me.s, 1, 0);
      if (!this.crash && this.t % 3 === 0) this.fx.add(p.pos(rw.s + 2, 0, 5), [(Math.random() - 0.5) * 0.04, 0.08, 0], 50, '#303030', 1.0, -0.001, 'alpha');
      this.fx.draw();
      GL.end();
      // HUD: distance to North Corel, gap, lever
      R.window(12, 10, 260, 58);
      R.text('NORTH COREL', 22, 16, { size: 12, color: R.COL.cyan });
      R.text(`${Math.max(0, Math.round(TRAIN_LEN - rw.s))} m`, 260, 14, { size: 16, align: 'right', color: TRAIN_LEN - rw.s < 300 ? '#ff6060' : '#ffffff' });
      R.bar(22, 44, 238, 6, rw.s / TRAIN_LEN, '#ff8040', '#ffe060');
      if (this.phase === 'chase') { R.window(W - 212, 10, 200, 40); R.text('GAP', W - 200, 16, { size: 12, color: R.COL.cyan }); R.text(`${Math.max(0, Math.round(rw.s - me.s - 9))} m`, W - 24, 18, { size: 16, align: 'right' }); }
      // lever panel
      const lx = W / 2, ly = H - 70;
      R.window(lx - 150, ly - 30, 300, 88);
      const c = R.ctx, ang = (this.lever > 0 ? this.leverSide * 0.5 * Math.sin(this.lever / 16 * Math.PI) : 0);
      c.save(); c.translate(lx, ly + 44); c.rotate(ang); c.fillStyle = '#8a8a90'; c.fillRect(-4, -58, 8, 58); c.fillStyle = '#d03030'; c.beginPath(); c.arc(0, -60, 9, 0, Math.PI * 2); c.fill(); c.restore();
      if (this.phase === 'chase') { ui.keys(['up'], lx - 136, ly + 4, 20); ui.keys(['menu'], lx + 56, ly + 4, 20); R.text('Alternate!', lx, ly - 24, { size: 13, align: 'center', color: '#ffe060' }); }
      else if (!this.over) this.combo.forEach((cb, i) => { const x = lx - 136 + (i > 0 ? 194 * 0 : 0); if (i !== this.ci) return; ui.keys([cb[0], '+', cb[1]], lx - 136, ly + 4, 20); R.text(`Brake lever ${i + 1}/3`, lx + 60, ly - 6, { size: 13, color: '#ffe060' }); });
      ui.readyGo(this.t, 180);
      if (this.msg) ui.big(this.msg.text, 140, '#ffe060', 26, Math.min(1, this.msg.t / 20));
      if (this.over) ui.big(this.stopped ? 'The train stopped!' : this.crash ? 'CRASH!' : '', 200, this.stopped ? '#ffe060' : '#ff6060', 36);
    }
    resultTitle(r) { return r.stopped ? 'TRAIN STOPPED!' : 'IT CRASHED INTO NORTH COREL...'; }
    resultRows(r) { return [['Caught the train', r.caught ? 'Yes' : 'No'], ['Stopped it', r.stopped ? 'Yes' : 'No'], ['Metres to spare', r.score]]; }
  }
  MG.register('train_escape', {
    title: 'Runaway Train',
    music: () => 'hurry',
    help: (o) => ({ title: 'RUNAWAY TRAIN', lines: ['The runaway train is heading for North Corel! Pump the levers to catch up with it, then pull the brakes.', `Pump by pressing ${MG.btn('up')} and ${MG.btn('menu')} one after the other. To brake: ${MG.btn('up')}+${MG.btn('menu')}, ${MG.btn('down')}+${MG.btn('cancel')}, ${MG.btn('down')}+${MG.btn('cancel')}.`], controls: [[['up', '/', 'menu'], 'Alternate to speed up'], [['up', '+', 'menu'], 'Brake 1'], [['down', '+', 'cancel'], 'Brakes 2 and 3']] }),
    create: (opts) => new TrainGame(opts),
  });

  // ================================================================== PARACHUTE (Midgar raid)
  class ChuteGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.p = [60, 700, 140]; this.v = [0, 0, 0]; this.chute = false; this.flip = 0; this.flips = 0;
      this.target = [-18, 26, -40];      // the landing zone on the plate (sector 8, near the Mako Cannon)
      this.wind = [0.03, 0, -0.02];
      this.cloud = MG.char(opts.player || 'cloud'); this.cloud.scale = 3;
      const rnd = MG.rng('midgar-from-above');
      this.city = MG.mesh(mb => {
        mb.floor(-900, -900, 900, 900, -40, '#4a4a3a');                                 // wasteland
        for (let i = 0; i < 8; i++) {                                                    // the eight sector plates
          const a0 = i / 8 * Math.PI * 2 + 0.02, a1 = (i + 1) / 8 * Math.PI * 2 - 0.02;
          for (let k = 0; k < 6; k++) {
            const b0 = U.lerp(a0, a1, k / 6), b1 = U.lerp(a0, a1, (k + 1) / 6);
            const col = (k + i) % 2 ? '#4a5058' : '#454b53';
            mb.tri([Math.sin(b0) * 34, 25, Math.cos(b0) * 34], [Math.sin(b0) * 300, 25, Math.cos(b0) * 300], [Math.sin(b1) * 300, 25, Math.cos(b1) * 300], col);
            mb.tri([Math.sin(b0) * 34, 25, Math.cos(b0) * 34], [Math.sin(b1) * 300, 25, Math.cos(b1) * 300], [Math.sin(b1) * 34, 25, Math.cos(b1) * 34], col);
          }
          // buildings
          for (let k = 0; k < 40; k++) { const a = U.lerp(a0, a1, rnd()), r = 50 + rnd() * 240, h = 2 + rnd() * rnd() * 16; mb.box(Math.sin(a) * r, 25 + h / 2, Math.cos(a) * r, 4 + rnd() * 6, h, 4 + rnd() * 6, U.mix('#5a6068', '#707880', rnd())); }
          // reactor at the plate edge
          const ra = (i + 0.5) / 8 * Math.PI * 2;
          mb.prism(Math.sin(ra) * 270, 25, Math.cos(ra) * 270, 14, 10, 50, 10, '#3a3a44');
        }
        mb.prism(0, -40, 0, 36, 36, 65, 16, '#383840');                                    // central pillar
        mb.box(0, 60, 0, 22, 70, 22, '#50565e'); mb.box(0, 100, 0, 16, 12, 16, '#40464e'); // Shinra HQ
        mb.push(); mb.translate(0, 80, 0); mb.rotate(Math.PI / 2 - 0.12, -0.9, 0); mb.prism(0, 0, 0, 7, 5, 200, 12, '#6a6a74', true); mb.pop();   // the Mako Cannon (Sister Ray)
        for (let i = 0; i < 90; i++) { const a = rnd() * Math.PI * 2, r = 120 + rnd() * 700; mb.sphere(Math.sin(a) * r, -40, Math.cos(a) * r, 8 + rnd() * 16, 3 + rnd() * 6, 8 + rnd() * 16, '#5a5646', 6, 3, false); }
      });
      this.glow = MG.mesh(mb => { for (let i = 0; i < 8; i++) { const ra = (i + 0.5) / 8 * Math.PI * 2; mb.prism(Math.sin(ra) * 270, 75, Math.cos(ra) * 270, 11, 9, 3, 10, '#60ff90'); } }, { unlit: true });
      this.marker = MG.mesh(mb => { mb.prism(0, 0, 0, 9, 9, 0.3, 24, '#ff3030', false, true, false); mb.prism(0, 0.1, 0, 6, 6, 0.3, 24, '#ffffff', false, true, false); mb.prism(0, 0.2, 0, 3, 3, 0.3, 24, '#ff3030', false, true, false); }, { unlit: true });
      this.puff = MG.mesh(mb => mb.sphere(0, 0, 0, 1, 0.6, 1, '#ffffff', 8, 5, true), { blend: 'alpha' });
      this.canopy = MG.mesh(mb => { mb.sphere(0, 0, 0, 3.2, 1.2, 2.4, '#e8e8f0', 10, 5, true, (i) => i % 2 ? '#e04040' : '#f0f0f0', 3); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mb.push(); mb.translate(Math.cos(a) * 1.4, -2.2, Math.sin(a) * 1.1); mb.box(0, 0, 0, 0.04, 4.4, 0.04, '#d0d0d0'); mb.pop(); } }, { cull: false });
      this.clouds = [];
      for (let i = 0; i < 26; i++) this.clouds.push([(rnd() - 0.5) * 500, 120 + rnd() * 560, (rnd() - 0.5) * 500, 10 + rnd() * 18]);
    }
    update(I) {
      this.t++; this.fx.update();
      if (this.landed) { if (++this.landed > 100) { const d = this.dist(); const score = Math.round(U.clamp(100 - d * 2.2, 0, 100)); this.result = { won: d < 14, score, dist: Math.round(d * 10) / 10, flips: this.flips }; this.done = true; } return; }
      const go = this.t >= MG.READY;
      const d = go ? I.dir() : { x: 0, y: 0 };
      const acc = this.chute ? 0.03 : 0.018;
      this.v[0] += d.x * acc; this.v[2] += d.y * acc;
      this.v[0] *= 0.97; this.v[2] *= 0.97;
      if (this.t % 240 === 0) this.wind = [(Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08];
      const fall = this.chute ? 0.28 : 1.15;
      this.v[1] = U.lerp(this.v[1], -fall, 0.05);
      for (let k = 0; k < 3; k++) this.p[k] += this.v[k] + this.wind[k] * (this.chute ? 1.6 : 0.6);
      if (go && !this.chute && (I.pressed('ok') || this.p[1] < 160)) { this.chute = true; MG.sfx('search', 0.7); }
      if (go && !this.chute && I.pressed('square') && this.flip <= 0) { this.flip = 40; this.flips++; }
      if (this.flip > 0) this.flip--;
      const ground = this.groundY();
      if (this.p[1] <= ground) { this.p[1] = ground; this.landed = 1; MG.sfx('hop'); this.fx.burst(this.p, 16, '#c0c0c0', 0.2, 30, 1.2, 0.01, 'alpha'); }
    }
    groundY() { const r = Math.hypot(this.p[0], this.p[2]); return r < 300 ? 26 : -40; }
    dist() { return Math.hypot(this.p[0] - this.target[0], this.p[2] - this.target[2]); }
    bot() {
      if (this.t < MG.READY || this.landed) return [];
      const out = [], dx = this.target[0] - this.p[0], dz = this.target[2] - this.p[2];
      const lead = this.chute ? 30 : 18;
      if (dx - this.v[0] * lead > 1.5) out.push('right'); else if (dx - this.v[0] * lead < -1.5) out.push('left');
      if (dz - this.v[2] * lead > 1.5) out.push('down'); else if (dz - this.v[2] * lead < -1.5) out.push('up');
      if (!this.chute && this.p[1] < 260 && Math.hypot(dx, dz) < 60) out.push('ok');
      return out;
    }
    debugLog() { return `alt=${this.p[1].toFixed(0)} dist=${this.dist().toFixed(1)} chute=${this.chute}`; }
    render() {
      MG.sky('#203050', '#a0a8b8');
      const p = this.p;
      const eye = [p[0], p[1] + (this.chute ? 14 : 10), p[2] + 9];
      this.cam.set(eye, [p[0], p[1] - 30, p[2] - 8], 60, 0.5, 1600);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.55, 0.58, 0.64], near: 300, far: 1300 }, light: { dir: [-0.3, -0.8, -0.4], color: [0.6, 0.6, 0.64], ambient: [0.46, 0.46, 0.52] } });
      this.cam.apply();
      GL.draw(this.city, null);
      GL.draw(this.glow, null, { add: [0.1 * Math.sin(this.t * 0.05), 0.1 * Math.sin(this.t * 0.05), 0.1 * Math.sin(this.t * 0.05)] });
      MG.put(this.marker, [this.target[0], this.target[1] - 0.6, this.target[2]], [0, this.t * 0.01, 0], 1, { tint: [1, 1, 1, 1] });
      const cm = this.cloud;
      cm.onPose = (m) => { const b = (n) => m.b(n); if (this.landed) return; if (this.chute) { b('armL').rot[0] = -2.9; b('armR').rot[0] = -2.9; b('thighL').rot[0] = -0.2; } else { b('armL').rot[2] = 1.3; b('armR').rot[2] = -1.3; b('thighL').rot[2] = 0.3; b('thighR').rot[2] = -0.3; b('shinL').rot[0] = 0.4; b('shinR').rot[0] = 0.4; } };
      cm.update();
      const flipA = this.flip > 0 ? (1 - this.flip / 40) * Math.PI * 2 : 0;
      if (this.chute && !this.landed) { MG.drawModel(cm, [p[0], p[1] - 1.5, p[2]], Math.PI, -this.v[2] * 3, this.v[0] * 3); MG.put(this.canopy, [p[0], p[1] + 8, p[2]], [0, 0, this.v[0] * 2]); }
      else if (this.landed) MG.drawModel(cm, [p[0], p[1], p[2]], Math.PI);
      else MG.drawModel(cm, [p[0], p[1], p[2] + 1.5], Math.PI, -Math.PI / 2 + 0.2 + flipA - this.v[2] * 2, this.v[0] * 2);
      for (const c of this.clouds) if (Math.abs(c[1] - p[1]) < 140) MG.put(this.puff, [c[0], c[1], c[2]], null, c[3], { tint: [1, 1, 1, 0.55] });
      this.fx.draw();
      GL.end();
      R.window(12, 10, 150, 40); R.text('ALTITUDE', 22, 15, { size: 12, color: R.COL.cyan }); R.text(`${Math.max(0, Math.round((p[1] - this.groundY()) * 1.5))} m`, 150, 22, { size: 16, align: 'right' });
      R.window(W - 162, 10, 150, 40); R.text('TARGET', W - 152, 15, { size: 12, color: R.COL.cyan }); R.text(`${Math.round(this.dist() * 1.5)} m`, W - 24, 22, { size: 16, align: 'right' });
      if (!this.chute && !this.landed) { R.window(W / 2 - 110, H - 50, 220, 38); R.text('Open the chute', W / 2 - 96 + ui.keys(['ok'], W / 2 - 96, H - 31, 16) + 4, H - 40, { size: 14 }); }
      ui.readyGo(this.t, 180);
      if (this.landed) ui.big(this.dist() < 14 ? 'Touchdown!' : 'Off target...', 190, this.dist() < 14 ? '#ffe060' : '#ff9090', 36);
    }
    resultTitle(r) { return r.won ? 'ON TARGET!' : 'LANDED OFF TARGET'; }
    resultRows(r) { return [['Distance from target', `${Math.round(r.dist * 1.5)} m`], ['Landing score', r.score, '#ffe060']]; }
  }
  MG.register('parachute', {
    title: 'Midgar Raid Skydive',
    music: () => 'hurryfaster',
    help: () => ({ title: 'SKYDIVE', lines: ['Jump from the Highwind and steer your fall onto the landing zone marked on the plate.', 'The chute opens by itself when you get low. Open it early for more time to steer.'], controls: [[['up', 'down', 'left', 'right'], 'Steer'], [['ok'], 'Open the chute'], [['square'], 'Somersault']] }),
    create: (opts) => new ChuteGame(opts),
  });

  // ================================================================== SUPER DUNK
  class DunkGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.gp = 0; this.hits = 0; this.streak = 0; this.state = 'aim'; this.st = 0; this.power = 0; this.dbl = false; this.choice = 0; this.throws = 0;
      this.rate = 1;
      this.cloud = MG.char(opts.player || 'cloud'); this.cloud.scale = 1.5;
      this.hoop = [0, 3.05, -6.2];
      this.env = MG.mesh(mb => {
        mb.floor(-10, -12, 10, 6, 0, '#b07840');
        for (let x = -10; x < 10; x += 1) mb.floor(x, -12, x + 0.04, 6, 0.005, '#8a5a30');
        mb.floor(-3, -8, 3, -2.4, 0.01, '#c0884a');
        mb.floor(-0.05, -2.45, 0.05, -2.35, 0.02, '#ffffff'); mb.floor(-1.8, -2.45, 1.8, -2.35, 0.02, '#ffffff');
        mb.box(0, 5, -9, 20, 10, 0.3, '#403050'); mb.box(0, 8.5, -8.8, 12, 1.4, 0.1, '#e0c040'); mb.box(0, 8.5, -8.75, 11.4, 1, 0.1, '#6040a0');
        mb.box(0, 1.8, -7.6, 0.25, 3.6, 0.25, '#707078');                                     // pole
        mb.box(0, 3.5, -6.9, 0.2, 0.2, 1.4, '#707078');
        mb.box(0, 3.55, -6.55, 1.8, 1.1, 0.08, '#f0f0f0'); mb.box(0, 3.35, -6.5, 0.6, 0.45, 0.02, '#e04030');   // backboard
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; mb.box(Math.cos(a) * 0.25, 3.05, -6.2 + Math.sin(a) * 0.25, 0.1, 0.03, 0.1, '#e05020'); }  // rim
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mb.box(Math.cos(a) * 0.2, 2.85, -6.2 + Math.sin(a) * 0.2, 0.02, 0.4, 0.02, '#f0f0f0'); }        // net
      });
      this.ball = MG.mesh(mb => { mb.sphere(0, 0, 0, 0.14, 0.14, 0.14, '#e07020', 10, 7, true); mb.box(0, 0, 0, 0.29, 0.01, 0.01, '#301808'); }, { });
      this.newShot();
    }
    newShot() { this.state = 'aim'; this.st = 0; this.power = 0; this.rate = 1 + (Math.random() - 0.5) * 0.12; this.outcome = null; }
    outcomeFor(p) { return p < 56 ? 'short' : p < 73 ? 'swish' : p < 83 ? 'bank' : 'long'; }
    update(I) {
      this.t++; this.st++; this.fx.update();
      if (this.state === 'aim') {
        if (I.held('ok') && this.st > 12) { this.state = 'charge'; this.st = 0; this.power = 0; }
      } else if (this.state === 'charge') {
        this.power = Math.min(100, this.power + 1.45 * this.rate);
        if (!I.held('ok')) { this.throws++; this.outcome = this.outcomeFor(this.power); this.state = 'fly'; this.st = 0; MG.sfx('jump', 0.5); }
      } else if (this.state === 'fly') {
        if (this.st >= 55) {
          const hit = this.outcome === 'swish' || this.outcome === 'bank';
          if (hit) { this.fx.burst(this.hoop, 10, '#ffffff', 0.08, 20, 0.12, 0.004, 'alpha'); MG.sfx('ching'); }
          else MG.sfx('error', 0.6);
          if (this.dbl) { this.dbl = false; if (hit) { this.gp = Math.min(300, this.gp * 2); this.hits++; this.say(`DOUBLE! ${this.gp} GP`); this.streak = 0; } else { this.gp = 1; this.say('Missed the Double Chance...'); return this.finish(); } }
          else if (hit) { this.gp = Math.min(300, this.gp + 1); this.hits++; this.streak++; this.say('NICE!'); }
          else { this.say('MISS!'); return this.finish(); }
          if (this.gp >= 300) return this.finish();
          if (this.streak >= 10) { this.state = 'ask'; this.st = 0; this.choice = 0; return; }
          this.newShot();
        }
      } else if (this.state === 'ask') {
        if (I.repeat('up') || I.repeat('down')) { this.choice = 1 - this.choice; MG.sfx('cursor'); }
        if (this.st > 10 && I.pressed('ok')) { MG.sfx('confirm'); this.streak = 0; if (this.choice === 0) { this.dbl = true; this.say('DOUBLE CHANCE!'); } this.newShot(); }
      } else if (this.state === 'end') {
        if (this.st > 80) { this.result = { won: this.gp > 0, score: this.gp, hits: this.hits, throws: this.throws }; this.done = true; }
      }
      if (this.msg && --this.msg.t <= 0) this.msg = null;
    }
    say(text) { this.msg = { text, t: 50 }; }
    finish() { this.state = 'end'; this.st = 0; }
    bot() {
      if (this.state === 'aim') return this.st > 14 ? ['ok'] : [];
      if (this.state === 'charge') return this.power < 64 + (this.botErr || 0) ? ['ok'] : [];
      if (this.state === 'ask') { if (this.choice !== 1 && this.gp >= 60) return this.st === 4 ? ['down'] : []; return this.st > 14 ? ['ok'] : []; }
      if (this.state === 'fly' && this.st === 1) this.botErr = (Math.random() - 0.5) * (this.hits > 25 ? 40 : 14);
      return [];
    }
    ballPos() {
      const start = [0.25, 1.9, -1.9];
      if (this.state !== 'fly') { const k = this.state === 'charge' ? this.power / 100 : 0; return [start[0], start[1] - k * 0.4 + Math.abs(Math.sin(this.t * 0.2)) * (this.state === 'aim' ? 0.05 : 0), start[2]]; }
      const k = Math.min(1, this.st / 55);
      const o = this.outcome;
      const end = o === 'short' ? [0.1, 2.6, -5.6] : o === 'long' ? [0.2, 3.9, -6.5] : o === 'bank' ? [0.05, 3.0, -6.2] : this.hoop;
      if (o === 'bank' && k > 0.6) { const kk = (k - 0.6) / 0.4; return [U.lerp(0.1, 0, kk), U.lerp(3.6, 2.7, kk), U.lerp(-6.45, -6.2, kk)]; }
      const e = o === 'bank' ? [0.1, 3.6, -6.45] : end;
      const kk = o === 'bank' ? k / 0.6 : k;
      const drop = o === 'swish' && k > 0.85 ? (k - 0.85) * 3 : 0;
      return [U.lerp(start[0], e[0], kk), U.lerp(start[1], e[1], kk) + Math.sin(kk * Math.PI) * 2.2 - drop, U.lerp(start[2], e[2], kk)];
    }
    render() {
      MG.sky('#301830', '#100818');
      this.cam.set([2.6, 2.6, 2.2], [0, 2.6, -5], 50, 0.2, 100);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.5], color: [0.78, 0.72, 0.66], ambient: [0.46, 0.42, 0.48] } });
      this.cam.apply();
      GL.draw(this.env, null);
      const cm = this.cloud;
      const k = this.state === 'charge' ? this.power / 100 : 0, rel = this.state === 'fly' ? Math.max(0, 1 - this.st / 12) : 0;
      cm.onPose = (m) => { const b = (n) => m.b(n); b('hips').pos[1] = -0.06 * k; b('thighL').rot[0] = -0.5 * k; b('thighR').rot[0] = -0.5 * k; b('shinL').rot[0] = 0.9 * k; b('shinR').rot[0] = 0.9 * k; b('armL').rot[0] = -2.2 - rel * 0.6; b('armR').rot[0] = -2.2 - rel * 0.6; b('foreL').rot[0] = -1.2 + rel; b('foreR').rot[0] = -1.2 + rel; b('head').rot[0] = -0.3; };
      cm.update();
      MG.drawModel(cm, [0.25, 0, -1.6], Math.PI);
      MG.put(this.ball, this.ballPos(), [this.t * 0.2, 0, 0]);
      this.fx.draw();
      GL.end();
      R.window(12, 10, 150, 40); R.text('GP', 22, 15, { size: 12, color: R.COL.cyan }); R.text(String(this.gp), 150, 20, { size: 18, align: 'right', color: '#ffe060' });
      R.window(W - 162, 10, 150, 40); R.text('IN A ROW', W - 152, 15, { size: 12, color: R.COL.cyan }); R.text(`${this.streak}/10`, W - 24, 20, { size: 16, align: 'right' });
      // power meter
      R.window(W / 2 - 150, H - 58, 300, 46);
      const c = R.ctx, x0 = W / 2 - 134, bw = 268;
      c.fillStyle = '#202028'; c.fillRect(x0, H - 44, bw, 16);
      c.fillStyle = 'rgba(80,200,120,0.45)'; c.fillRect(x0 + bw * 0.56, H - 44, bw * 0.27, 16);
      c.fillStyle = '#ffb030'; c.fillRect(x0, H - 40, bw * (this.state === 'charge' ? this.power : this.state === 'fly' ? this.lastPow || 0 : 0) / 100, 8);
      if (this.state === 'charge') this.lastPow = this.power;
      if (this.state === 'aim') R.text('Hold ' + MG.btn('ok') + ', release at the right power', W / 2, H - 76, { size: 13, align: 'center' });
      if (this.state === 'ask') { R.window(W / 2 - 110, 170, 220, 96); R.text('Double Chance?', W / 2, 180, { size: 16, align: 'center', color: '#ffe060' }); R.text(`Now: ${this.gp} GP`, W / 2, 202, { size: 13, align: 'center' }); ['Yes', 'No'].forEach((s, i) => R.text(s, W / 2 - 20, 222 + i * 20, { size: 15 })); R.cursor(W / 2 - 28, 232 + this.choice * 20); }
      if (this.dbl && this.state !== 'ask') R.text('DOUBLE CHANCE', W / 2, 60, { size: 18, align: 'center', weight: '800', color: '#ff8040' });
      if (this.msg) ui.big(this.msg.text, 130, '#ffe060', 32, Math.min(1, this.msg.t / 12));
    }
    resultTitle(r) { return `${r.score} GP`; }
    resultRows(r) { return [['Baskets', r.hits], ['GP won', r.score, '#ffe060']]; }
  }

  // ================================================================== DARTS
  const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
  const RINGS = { bull: 0.032, outerBull: 0.08, tripleIn: 0.47, tripleOut: 0.53, doubleIn: 0.94, doubleOut: 1.0 };
  function dartScore(x, y) {       // board coords, radius 1
    const r = Math.hypot(x, y);
    if (r > RINGS.doubleOut) return 0;
    if (r < RINGS.bull) return 50;
    if (r < RINGS.outerBull) return 25;
    let a = Math.atan2(x, y);                 // 0 = up (20), clockwise
    if (a < 0) a += Math.PI * 2;
    const n = ORDER[Math.floor(((a + Math.PI / 20) % (Math.PI * 2)) / (Math.PI / 10))];
    if (r >= RINGS.tripleIn && r < RINGS.tripleOut) return n * 3;
    if (r >= RINGS.doubleIn) return n * 2;
    return n;
  }
  class DartsGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam();
      this.darts = []; this.score = 0; this.target = opts.target || 150; this.maxDarts = opts.darts || 9;
      this.aim = [0, 0]; this.thrown = null;
      this.board = MG.mesh(mb => {
        const seg = (r0, r1, a0, a1, col) => { const n = Math.max(3, Math.ceil((a1 - a0) / (Math.PI / 30))); for (let k = 0; k < n; k++) { const b0 = U.lerp(a0, a1, k / n), b1 = U.lerp(a0, a1, (k + 1) / n); mb.quad([Math.sin(b0) * r0, Math.cos(b0) * r0, 0], [Math.sin(b1) * r0, Math.cos(b1) * r0, 0], [Math.sin(b1) * r1, Math.cos(b1) * r1, 0], [Math.sin(b0) * r1, Math.cos(b0) * r1, 0], col); } };
        seg(1.0, 1.25, 0, Math.PI * 2, '#1a1a1a');
        for (let i = 0; i < 20; i++) {
          const a0 = (i - 0.5) * Math.PI / 10, a1 = (i + 0.5) * Math.PI / 10, dark = i % 2 === 0;
          seg(RINGS.outerBull, RINGS.tripleIn, a0, a1, dark ? '#202020' : '#e8dcb8');
          seg(RINGS.tripleIn, RINGS.tripleOut, a0, a1, dark ? '#c02020' : '#208040');
          seg(RINGS.tripleOut, RINGS.doubleIn, a0, a1, dark ? '#202020' : '#e8dcb8');
          seg(RINGS.doubleIn, RINGS.doubleOut, a0, a1, dark ? '#c02020' : '#208040');
        }
        seg(RINGS.bull, RINGS.outerBull, 0, Math.PI * 2, '#208040'); seg(0, RINGS.bull, 0, Math.PI * 2, '#c02020');
      }, { cull: false });
      this.wall = MG.mesh(mb => { mb.box(0, 2, -0.1, 12, 8, 0.1, '#4a3a2a'); mb.floor(-6, -0.1, 6, 8, -2, '#5a4030'); });
      this.dartM = MG.mesh(mb => { mb.box(0, 0, 0.18, 0.02, 0.02, 0.36, '#c0c0c0'); mb.box(0, 0.03, 0.34, 0.01, 0.07, 0.06, '#e04040'); mb.box(0.03, 0, 0.34, 0.07, 0.01, 0.06, '#e04040'); });
    }
    update(I) {
      this.t++;
      if (this.over) { if (++this.over > 80) { this.result = { won: this.score >= this.target, score: this.score, darts: this.darts.length }; this.done = true; } return; }
      // the aim wanders (hand sway); the player nudges it
      const sway = [Math.sin(this.t * 0.043) * 0.35 + Math.sin(this.t * 0.11) * 0.12, Math.cos(this.t * 0.037) * 0.3 + Math.sin(this.t * 0.09) * 0.1];
      const d = I.dir();
      this.nudge = this.nudge || [0, 0];
      this.nudge[0] = U.clamp(this.nudge[0] + d.x * 0.02, -1.2, 1.2); this.nudge[1] = U.clamp(this.nudge[1] - d.y * 0.02, -1.2, 1.2);
      this.aim = [this.nudge[0] + sway[0], this.nudge[1] + sway[1]];
      if (this.thrown) { if (++this.thrown.t >= 16) { this.darts.push(this.thrown.at); this.score += this.thrown.pts; this.popup = { text: this.thrown.pts ? '+' + this.thrown.pts : 'MISS', t: 40 }; this.thrown = null; MG.sfx(this.darts[this.darts.length - 1] ? 'hit' : 'error', 0.5); if (this.darts.length >= this.maxDarts) this.over = 1; } return; }
      if (this.t > MG.READY && I.pressed('ok')) { const at = [this.aim[0] + (Math.random() - 0.5) * 0.06, this.aim[1] + (Math.random() - 0.5) * 0.06]; this.thrown = { at, t: 0, pts: dartScore(at[0], at[1]) }; MG.sfx('jump', 0.4); }
      if (this.popup && --this.popup.t <= 0) this.popup = null;
    }
    bot() {
      if (this.t <= MG.READY || this.thrown || this.over) return [];
      const want = [0, 0.73], out = [];      // treble 20
      const sway = [Math.sin(this.t * 0.043) * 0.35 + Math.sin(this.t * 0.11) * 0.12, Math.cos(this.t * 0.037) * 0.3 + Math.sin(this.t * 0.09) * 0.1];
      const n = this.nudge || [0, 0];
      if (n[0] < want[0] - 0.03) out.push('right'); else if (n[0] > want[0] + 0.03) out.push('left');
      if (n[1] < want[1] - 0.03) out.push('up'); else if (n[1] > want[1] + 0.03) out.push('down');
      if (Math.hypot(this.aim[0] - want[0], this.aim[1] - want[1]) < 0.12 && this.t % 2 === 0) out.push('ok');
      return out;
    }
    render() {
      MG.sky('#201810', '#100a06');
      this.cam.set([0, 2, 5.2], [0, 2, 0], 42, 0.2, 60);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.2, -0.5, -0.8], color: [0.8, 0.76, 0.66], ambient: [0.5, 0.46, 0.44] } });
      this.cam.apply();
      GL.draw(this.wall, null);
      const S = 1.4, B = [0, 2, 0];
      MG.put(this.board, B, null, S);
      for (const d of this.darts) MG.put(this.dartM, [B[0] + d[0] * S, B[1] + d[1] * S, 0.02], [0.1, 0.1, 0]);
      if (this.thrown) { const k = this.thrown.t / 16; MG.put(this.dartM, [B[0] + this.thrown.at[0] * S * k, B[1] + U.lerp(-0.6, this.thrown.at[1] * S, k) + Math.sin(k * Math.PI) * 0.4, U.lerp(4.4, 0.02, k)], [0.1, 0, 0]); }
      GL.end();
      ORDER.forEach((n, i) => { const a = i * Math.PI / 10, q = this.cam.project([B[0] + Math.sin(a) * 1.13 * S, B[1] + Math.cos(a) * 1.13 * S, 0.02]); R.text(String(n), q.x, q.y - 7, { size: 12, align: 'center', color: '#f0f0f0', shadow: false }); });
      if (!this.thrown && !this.over) { const q = this.cam.project([B[0] + this.aim[0] * S, B[1] + this.aim[1] * S, 0.05]); const c = R.ctx; c.save(); c.strokeStyle = '#ffe040'; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, 9, 0, Math.PI * 2); c.moveTo(q.x - 15, q.y); c.lineTo(q.x + 15, q.y); c.moveTo(q.x, q.y - 15); c.lineTo(q.x, q.y + 15); c.stroke(); c.restore(); }
      R.window(12, 10, 170, 60); R.text('SCORE', 22, 15, { size: 12, color: R.COL.cyan }); R.text(String(this.score), 170, 18, { size: 18, align: 'right' }); R.text(`Darts ${this.darts.length}/${this.maxDarts}   Goal ${this.target}`, 22, 44, { size: 12, color: R.COL.gray });
      if (this.popup) ui.big(this.popup.text, 120, '#ffe060', 30, Math.min(1, this.popup.t / 12));
      ui.readyGo(this.t, 200);
    }
    resultTitle(r) { return r.won ? 'BULLSEYE!' : 'BETTER LUCK NEXT TIME'; }
    resultRows(r) { return [['Score', r.score, '#ffe060'], ['Needed', this.target]]; }
  }
  MG.register('darts', {
    title: 'Darts / Super Dunk',
    music: null,
    help: (o) => o.variant === 'super_dunk' ? {
      title: o.title ? o.title.toUpperCase() : 'SUPER DUNK',
      lines: [`Sink as many baskets in a row as you can: 1 GP each. Hold ${MG.btn('ok')} to build power and let go at the right moment.`, 'After every 10 baskets you may try a Double Chance: make it to double your GP, miss it and you leave with 1 GP. One miss ends the game.'],
      controls: [[['ok'], 'Hold, then release to shoot'], [['up', 'down'], 'Choose (Double Chance)']],
    } : {
      title: o.title ? o.title.toUpperCase() : 'DARTS',
      lines: [`Throw ${o.darts || 9} darts and score at least ${o.target || 150} points. Your hand sways, so time your throw.`, 'Outer ring doubles, the inner ring triples. Bullseye: 50.'],
      controls: [[['up', 'down', 'left', 'right'], 'Steady your aim'], [['ok'], 'Throw']],
    },
    create: (opts) => opts.variant === 'super_dunk' ? new DunkGame(opts) : new DartsGame(opts),
  });
})();
