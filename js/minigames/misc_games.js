// Small story minigames:
//   squats     Wall Market gym squat contest: □ ✕ ○ in order, only when Cloud has stopped moving (30 s)
//   cpr        Priscilla: □ breathe in (don't overfill), ○ breathe into her
//   dolphin    Junon: whistle Mr. Dolphin (□ twice) from the right spot to jump up to the tower
//   parade     Junon: join the column, march in step (hold ←), press ○ on "Present arms!" -> TV rating %
//   wall_climb Gaea's Cliff: climb (↑) and keep Cloud's body temperature between 26 and 38 (○ / □ alternately)
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, V3 = FF7.V3, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const hipsY = (m) => (m.bones && m.bones.hips ? m.bones.hips.offset[1] : 0.41) * (m.scale || 1);
  const label = (cam, p, text, col, size) => { const q = cam.project(p); if (q.visible) R.text(text, q.x, q.y, { size: size || 16, align: 'center', color: col || '#ffffff', weight: '700' }); };

  // ================================================================== SQUATS
  const SQ = { down: 24, hold: 16, up: 24, scratch: 50 };
  const SQ_SEQ = ['square', 'cancel', 'ok'];
  function squatPose(m, st, k) {
    const b = (n) => m.b(n);
    // depth 0 (standing) .. 1 (full squat)
    const d = st === 'down' ? k : st === 'hold' ? 1 : st === 'up' ? 1 - k : 0;
    b('hips').pos[1] = -0.15 * d;
    b('thighL').rot[0] = -1.35 * d; b('thighR').rot[0] = -1.35 * d; b('thighL').rot[2] = 0.15; b('thighR').rot[2] = -0.15;
    b('shinL').rot[0] = 1.9 * d; b('shinR').rot[0] = 1.9 * d; b('footL').rot[0] = -0.5 * d; b('footR').rot[0] = -0.5 * d;
    b('torso').rot[0] = 0.45 * d;
    b('armL').rot[0] = -1.5 * d; b('armR').rot[0] = -1.5 * d; b('foreL').rot[0] = -0.2; b('foreR').rot[0] = -0.2;
    if (st === 'scratch') { b('armR').rot[0] = -2.6; b('armR').rot[2] = -0.3; b('foreR').rot[0] = -1.6 + Math.sin(FF7.frame * 0.5) * 0.3; b('head').rot[2] = 0.2; }
  }
  class SquatGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam();
      this.limit = 60 * (opts.time || 30);
      this.oppName = opts.opponentName || 'Rival';
      this.me = { st: 'stand', k: 0, n: 0, next: 0 };
      const target = opts.opponentScore || U.clamp(Math.round(15.5 + (Math.random() + Math.random() + Math.random() - 1.5) * 3.2), 12, 19);
      this.opp = { st: 'stand', k: 0, n: 0, target, period: this.limit / (target + 0.35), phase: 0 };
      this.cloud = MG.char(opts.player || 'cloud'); this.cloud.scale = 1.6;
      this.rival = MG.char({ base: 'man', build: 'big', top: '#f0f0f0', sleeve: 'skin', bottom: '#3a3a8a', hair: '#302018', hairStyle: 'buzz', skin: '#d8a070' }); this.rival.scale = 1.75;
      this.env = MG.mesh(mb => {
        mb.floor(-12, -10, 12, 6, 0, '#8a5a34');
        for (let i = -12; i < 12; i += 2) mb.floor(i, -10, i + 0.05, 6, 0.005, '#6a4428');
        mb.box(0, 3, -6, 24, 6, 0.3, '#4a3a4a'); mb.box(-12, 3, -2, 0.3, 6, 12, '#3a2e3a'); mb.box(12, 3, -2, 0.3, 6, 12, '#3a2e3a');
        mb.box(0, 5.2, -5.8, 10, 1.2, 0.1, '#d0c040'); mb.box(0, 5.2, -5.75, 9.4, 0.8, 0.1, '#2a2020');      // banner
        [-3.5, 3.5].forEach(x => { mb.floor(x - 1.6, -1.6, x + 1.6, 1.6, 0.01, '#304a80'); });                  // mats
        // weights + benches
        [[-8, -3], [8, -3.5], [-9.5, 1]].forEach(([x, z]) => { mb.box(x, 0.45, z, 2.2, 0.15, 0.7, '#503830'); mb.box(x, 0.2, z, 0.2, 0.4, 0.6, '#303030'); mb.push(); mb.translate(x, 1.1, z - 0.2); mb.rotate(0, 0, Math.PI / 2); mb.prism(0, -1.2, 0, 0.04, 0.04, 2.4, 6, '#c0c0c0'); mb.prism(0, -1.1, 0, 0.35, 0.35, 0.15, 10, '#202020'); mb.prism(0, 0.95, 0, 0.35, 0.35, 0.15, 10, '#202020'); mb.pop(); });
        mb.box(9, 1, 2, 1.2, 2, 1.2, '#6a2020');     // punching bag stand
      });
    }
    begin() { }
    stepMotion(p, dt) {
      if (p.st === 'down' || p.st === 'hold' || p.st === 'up' || p.st === 'scratch') {
        p.k += 1 / SQ[p.st];
        if (p.k >= 1) {
          p.k = 0;
          if (p.st === 'down') p.st = 'lowrest';
          else if (p.st === 'hold') p.st = 'holdrest';
          else if (p.st === 'up') { p.st = 'stand'; p.n++; if (p === this.me) MG.sfx('cursor', 0.7); }
          else if (p.st === 'scratch') p.st = p.back || 'stand';
        }
      }
    }
    update(I) {
      this.t++;
      const go = this.t >= MG.READY && !this.over;
      if (go) this.time = (this.time || 0) + 1;
      const me = this.me, o = this.opp;
      this.stepMotion(me); this.stepMotion(o);
      if (go) {
        const pressed = SQ_SEQ.find(b => I.pressed(b));
        if (pressed) {
          const want = SQ_SEQ[me.next];
          const still = me.st === 'stand' || me.st === 'lowrest' || me.st === 'holdrest';
          if (pressed === want && still) {
            me.st = ['down', 'hold', 'up'][me.next]; me.k = 0; me.next = (me.next + 1) % 3;
          } else if (me.st !== 'scratch') {
            // pressed too early (still moving) or the wrong button: he scratches his head and the
            // interrupted motion has to be done again
            const undo = { down: ['stand', 0], hold: ['lowrest', 1], up: ['holdrest', 2] }[me.st];
            if (undo) { me.back = undo[0]; me.next = undo[1]; } else me.back = me.st;
            me.st = 'scratch'; me.k = 0; MG.sfx('error', 0.5);
          }
        }
        // rival: steady pace
        o.phase++;
        const due = Math.floor(o.phase / o.period);
        if (due > o.n && o.st === 'stand' && o.n < o.target) { o.st = 'down'; o.k = 0; }
        else if (o.st === 'lowrest') { o.st = 'hold'; o.k = 0; } else if (o.st === 'holdrest') { o.st = 'up'; o.k = 0; }
        if (this.time >= this.limit) { this.over = 1; MG.sfx('beep'); }
      }
      if (this.over && ++this.over > 90) {
        const tie = me.n === o.n;
        this.result = { won: me.n > o.n, tie, score: me.n, opponent: o.n };
        this.done = true;
      }
    }
    bot() { const me = this.me; if (this.t < MG.READY || this.over) return []; const still = me.st === 'stand' || me.st === 'lowrest' || me.st === 'holdrest'; return still && this.t % 2 === 0 ? [SQ_SEQ[me.next]] : []; }
    render() {
      MG.sky('#2a1a24', '#100810');
      this.cam.set([0, 3.2, 8.5], [0, 1.3, 0], 42, 0.3, 80);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.6], color: [0.75, 0.68, 0.58], ambient: [0.42, 0.38, 0.38] } });
      this.cam.apply();
      GL.draw(this.env, null);
      const draw = (m, p, x) => { m.onPose = (mm) => squatPose(mm, p.st === 'lowrest' ? 'hold' : p.st === 'holdrest' ? 'hold' : p.st, p.k); m.update(); MG.shadow(x, 0, 0, 0.6, 0.35); MG.drawModel(m, [x, 0, 0], 0); };
      draw(this.cloud, this.me, -2.2); draw(this.rival, this.opp, 2.2);
      GL.end();
      // counters
      label(this.cam, [-2.2, 2.35, 0], String(this.me.n), '#ffe060', 30);
      label(this.cam, [2.2, 2.5, 0], String(this.opp.n), '#ff9090', 30);
      R.text('CLOUD', 150, 440, { size: 14, align: 'center', color: R.COL.cyan });
      R.text(this.oppName.toUpperCase(), 490, 440, { size: 14, align: 'center', color: R.COL.cyan });
      R.window(W / 2 - 60, 10, 120, 40);
      R.text(String(Math.ceil(Math.max(0, this.limit - (this.time || 0)) / 60)), W / 2, 16, { size: 24, align: 'center', weight: '700' });
      // the button order: all the same size; the one to press next is framed and bright, the others dimmed; each
      // with the player's key for it underneath
      R.window(W / 2 - 90, H - 66, 180, 56);
      SQ_SEQ.forEach((b, i) => {
        const x = W / 2 - 50 + i * 50, next = i === this.me.next, c = R.ctx;
        c.save(); c.globalAlpha = next ? 1 : 0.45;
        ui.glyph(b, x, H - 46, 24);
        R.text(MG.btn(b), x, H - 30, { size: 11, align: 'center', color: next ? '#ffffff' : '#9098b0', shadow: false });
        c.restore();
        if (next) { c.strokeStyle = (this.t >> 3) % 2 ? '#ffe060' : '#b09030'; c.lineWidth = 2; c.strokeRect(x - 18, H - 62, 36, 48); }
      });
      ui.readyGo(this.t, 160);
      if (this.over) ui.big('TIME!', 180, '#ffe060', 44);
    }
    resultTitle(r) { return r.won ? 'YOU WIN!' : r.tie ? 'DRAW' : 'YOU LOSE'; }
    resultRows(r) { return [['Cloud', `${r.score} squats`], [this.oppName, `${r.opponent} squats`]]; }
  }
  MG.register('squats', {
    title: 'Squat Contest',
    music: (o) => o.music || null,
    help: (o) => ({ title: 'SQUATS', lines: [`Do more squats than ${o.opponentName || 'your rival'} in 30 seconds!`, `Press ${MG.btn('square')}, ${MG.btn('cancel')}, ${MG.btn('ok')} in that order. Only press the next button once Cloud has stopped moving, or he’ll scratch his head and waste time.`], controls: [[['square'], 'Squat down'], [['cancel'], 'Hold'], [['ok'], 'Stand up']] }),
    create: (opts) => new SquatGame(opts),
  });

  // ================================================================== CPR
  class CprGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.cap = opts.capacity || 9; this.target = opts.target || 41;
      this.lungs = 0; this.given = 0; this.cough = 0; this.breaths = 0; this.blow = 0; this.limit = opts.time ? opts.time * 60 : 0; this.time = 0;
      this.cloud = MG.char(opts.player || 'cloud'); this.cloud.scale = 1.5;
      this.victim = MG.char(opts.victim || 'priscilla'); this.victim.scale = 1.2;
      this.env = MG.mesh(mb => {
        mb.floor(-30, -30, 30, 4, 0, '#e0c890');
        for (let i = 0; i < 40; i++) { const x = Math.sin(i * 7.1) * 12, z = Math.cos(i * 3.7) * 8 - 6; mb.floor(x, z, x + 0.3, z + 0.2, 0.005, '#c8b078'); }
        mb.floor(-40, -60, 40, -12, -0.2, '#3a80b8'); mb.floor(-40, -12, 40, -9, -0.05, '#e8f4f8');
        mb.box(-6, 1.5, -8, 2, 3, 2, '#7a6a5a');
      });
    }
    update(I) {
      this.t++; this.fx.update();
      if (this.blow > 0) this.blow--;
      if (this.cough > 0) { this.cough--; return; }
      if (this.finished) { if (++this.finished > 80) { this.result = { won: this.given >= this.target, score: this.breaths, breaths: this.breaths }; this.done = true; } return; }
      if (this.t < 30) return;
      this.time++;
      if (I.pressed('square')) {
        this.lungs++;
        MG.sfx('cursor', 0.4);
        if (this.lungs > this.cap) { this.lungs = 0; this.cough = 50; MG.sfx('error'); FF7.sceneMgr.doShake(2, 10); }
      }
      if (I.pressed('ok') && this.lungs > 0) {
        this.given = Math.min(this.target, this.given + this.lungs); this.breaths++; this.lungs = 0; this.blow = 24;
        MG.sfx('heal', 0.4);
        if (this.given >= this.target) { this.finished = 1; MG.sfx('heartbeat'); }
      }
      if (this.limit && this.time >= this.limit && !this.finished) this.finished = 1;
    }
    bot() { if (this.cough || this.finished || this.t < 30) return []; if (this.t % 3) return []; return this.lungs >= this.cap || (this.lungs > 0 && this.given + this.lungs >= this.target) ? ['ok'] : ['square']; }
    render() {
      MG.sky('#6aa8e8', '#f0e0c0');
      this.cam.set([1.5, 1.9, 3.3], [-0.4, 0.35, -0.6], 44, 0.2, 120);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.9, -0.3], color: [0.78, 0.74, 0.66], ambient: [0.5, 0.5, 0.52] } });
      this.cam.apply();
      GL.draw(this.env, null);
      // Priscilla lying on her back, head toward +x
      const vm = this.victim;
      vm.onPose = (m) => { m.b('armL').rot[2] = 0.3; m.b('armR').rot[2] = -0.3; m.b('torso').rot[0] = this.blow > 0 ? -0.05 * Math.sin(this.blow / 24 * Math.PI) : 0; };
      vm.update();
      vm.position = [-1.35, 0.12, 0]; vm.rotY = -Math.PI / 2; vm.rotX = -Math.PI / 2; vm.rotZ = 0;
      // (rotX lays the model on its back, face up; with this yaw her head points toward +x, next to Cloud)
      MG.shadow(-0.6, 0, 0, 0.9, 0.3);
      vm.draw();
      // Cloud kneeling by her head
      const cm = this.cloud;
      cm.onPose = (m) => {
        const b = (n) => m.b(n);
        b('hips').pos[1] = -0.13; b('thighL').rot[0] = -1.4; b('shinL').rot[0] = 1.4; b('thighR').rot[0] = 0.2; b('shinR').rot[0] = 1.6;
        const lean = this.blow > 0 ? 1 : this.cough > 0 ? -0.3 : 0.25 + this.lungs / this.cap * -0.35;
        b('torso').rot[0] = 0.4 + lean * 0.6; b('head').rot[0] = this.blow > 0 ? 0.6 : 0;
        b('armL').rot[0] = -0.9; b('armR').rot[0] = -0.9;
        if (this.cough > 0) b('head').rot[0] = Math.sin(this.cough * 0.8) * 0.3;
      };
      cm.update();
      MG.drawModel(cm, [0.55, 0, -0.45], -Math.PI / 2 + 0.5);
      this.fx.draw();
      GL.end();
      // gauges
      R.window(20, 20, 260, 70);
      R.text('CLOUD’S BREATH', 32, 26, { size: 12, color: R.COL.cyan });
      for (let i = 0; i < this.cap; i++) { R.ctx.fillStyle = i < this.lungs ? (this.lungs >= this.cap ? '#ffb040' : '#60c0ff') : '#202838'; R.ctx.fillRect(32 + i * 26, 50, 22, 26); }
      if (this.cough) R.text('*cough*', 150, 94, { size: 16, align: 'center', color: '#ff8080' });
      ui.gauge(this.opts.victimName ? this.opts.victimName.toUpperCase() : 'PRISCILLA', W - 280, 20, 260, this.given / this.target, '#ff7090', '#ffd0e0', `${Math.round(this.given / this.target * 100)}%`);
      if (this.limit) { R.window(W / 2 - 50, 20, 100, 34); R.text(MG.fmtClock(this.limit - this.time), W / 2, 26, { size: 16, align: 'center' }); }
      R.window(W / 2 - 150, H - 58, 300, 44);
      R.text('Breathe in', W / 2 - 136 + ui.keys(['square'], W / 2 - 136, H - 36, 18) + 4, H - 45, { size: 14 });
      R.text('Breathe out', W / 2 + 10 + ui.keys(['ok'], W / 2 + 10, H - 36, 18) + 4, H - 45, { size: 14 });
      if (this.finished && this.given >= this.target) ui.big('*cough* *cough*...', 200, '#ffffff', 26);
    }
    resultTitle(r) { return r.won ? 'SHE’S BREATHING!' : 'NOT ENOUGH AIR...'; }
    resultRows(r) { return [['Breaths given', r.breaths]]; }
  }
  MG.register('cpr', {
    title: 'CPR',
    music: null,
    help: (o) => ({ title: o.title || 'CPR', lines: [o.text || 'Priscilla isn’t breathing! Fill Cloud’s lungs, then breathe into her.', 'Don’t breathe in too much or Cloud will choke and have to start over.'], controls: [[['square'], 'Breathe in'], [['ok'], 'Breathe into her']] }),
    create: (opts) => new CprGame(opts),
  });

  // ================================================================== MR. DOLPHIN
  class DolphinGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.spot = [0, 0, 0];            // the right spot: where Cloud starts (FF7: don't move at all)
      this.pole = [-2.2, 0, -3.2];
      this.me = { p: this.spot.slice(), vx: 0, vz: 0 };
      this.state = 'swim'; this.st = 0; this.whistles = 0;
      this.cloud = MG.char(opts.player || 'cloud'); this.cloud.scale = 1.4;
      this.dolphin = MG.meshModel(MG.mesh(mb => {
        mb.push(); mb.rotate(Math.PI / 2, 0, 0);
        mb.loft([{ y: -1.3, rx: 0.08, rz: 0.08 }, { y: -0.9, rx: 0.25, rz: 0.22 }, { y: 0.2, rx: 0.45, rz: 0.4 }, { y: 0.8, rx: 0.35, rz: 0.32 }, { y: 1.1, rx: 0.14, rz: 0.12 }, { y: 1.45, rx: 0.08, rz: 0.06 }], { sides: 10, color: '#6a7a8a' });
        mb.pop();
        mb.blade([0, 0.35, -0.1], [0, 1, -0.6], 0.5, 0.35, 0.06, '#5a6a7a');
        mb.blade([0.3, -0.1, 0.3], [1, -0.4, -0.3], 0.5, 0.25, 0.05, '#5a6a7a'); mb.blade([-0.3, -0.1, 0.3], [-1, -0.4, -0.3], 0.5, 0.25, 0.05, '#5a6a7a');
        mb.blade([0, 0, -1.3], [1, 0, -0.4], 0.5, 0.25, 0.05, '#5a6a7a'); mb.blade([0, 0, -1.3], [-1, 0, -0.4], 0.5, 0.25, 0.05, '#5a6a7a');
        mb.sphere(0, -0.15, 0.3, 0.3, 0.22, 0.6, '#d8dce0', 8, 5, true);
      }), 0.8);
      this.env = MG.mesh(mb => {
        mb.floor(-80, -80, 80, 60, 0, '#2a70a8');
        // Junon cliff + the tower base with the electric pole
        mb.box(0, 8, -14, 60, 22, 6, '#6a6a60'); mb.box(0, 19.5, -14, 60, 1, 6.4, '#8a8a80');
        for (let i = 0; i < 12; i++) mb.box(-25 + i * 4.5, 26, -16, 3.6, 12 + (i % 3) * 4, 3, i % 2 ? '#707888' : '#606878');
        mb.box(-2.2, 0.5, -3.2, 3, 1.4, 3, '#707070');                      // concrete base
        mb.box(-2.2, 6.5, -3.2, 0.35, 12, 0.35, '#505058');                  // pole
        mb.box(-2.2, 12.2, -3.2, 3.2, 0.2, 0.3, '#505058'); mb.box(-2.2, 11.4, -3.2, 2.2, 0.2, 0.3, '#505058');
        [-1, 1].forEach(s => mb.box(-2.2 + s * 1.5, 12.0, -3.2, 0.15, 0.4, 0.15, '#d0d0c0'));
        // the pier (right) and a buoy
        mb.box(12, 1, 2, 4, 1, 30, '#8a7050'); for (let z = -12; z < 16; z += 4) { mb.box(10.2, -1, z, 0.4, 3, 0.4, '#5a4030'); mb.box(13.8, -1, z, 0.4, 3, 0.4, '#5a4030'); }
      });
      this.water = MG.mesh(mb => { for (let i = 0; i < 30; i++) { const x = Math.sin(i * 12.7) * 20, z = Math.cos(i * 5.3) * 14 + 4; mb.floor(x, z, x + 1.5, z + 0.1, 0.02, '#a0d0f0'); } }, { unlit: true, blend: 'alpha' });
    }
    dist() { return Math.hypot(this.me.p[0] - this.spot[0], this.me.p[2] - this.spot[2]); }
    update(I) {
      this.t++; this.st++; this.fx.update();
      const me = this.me;
      if (this.state === 'swim' || this.state === 'coming' || this.state === 'ready') {
        const d = I.dir();
        me.vx += d.x * 0.004; me.vz += d.y * 0.004; me.vx *= 0.94; me.vz *= 0.94;
        me.p[0] = U.clamp(me.p[0] + me.vx, -8, 8); me.p[2] = U.clamp(me.p[2] + me.vz, -1.5, 10);
        const whistle = I.pressed('square') || I.pressed('ok');
        if (whistle && this.t > 20) {
          MG.sfx('beep', 0.6);
          this.whistles++;
          if (this.state === 'swim') { this.state = 'coming'; this.st = 0; }
          else if (this.state === 'ready') { this.state = 'jump'; this.st = 0; const k = U.clamp(1 - this.dist() / 3.2, 0, 1); this.jumpH = 3 + 10.5 * k; this.jumpDist = this.dist(); this.success = this.jumpDist < 1.1; MG.sfx('jump'); this.fx.burst([me.p[0], 0.2, me.p[2]], 20, '#e0f4ff', 0.18, 30, 0.25, 0.01, 'alpha'); }
        }
        if (this.state === 'coming' && this.st > 70) { this.state = 'ready'; this.st = 0; this.fx.burst([me.p[0], 0.2, me.p[2]], 12, '#e0f4ff', 0.12, 24, 0.2, 0.01, 'alpha'); }
      } else if (this.state === 'jump') {
        const T = 70, k = Math.min(1, this.st / T);
        const top = this.success ? [this.pole[0], 12.3, this.pole[2]] : null;
        if (this.success) { me.p[0] = U.lerp(this.startP ? this.startP[0] : me.p[0], top[0], k); me.p[2] = U.lerp(this.startP ? this.startP[2] : me.p[2], top[2], k); }
        if (!this.startP) this.startP = me.p.slice();
        this.jy = this.success ? U.lerp(0, 12.3, 1 - Math.pow(1 - k, 2)) : this.jumpH * Math.sin(Math.min(1, this.st / (T * 1.4)) * Math.PI);
        if (this.success && this.st >= T) { this.state = 'land'; this.st = 0; MG.sfx('hop'); }
        if (!this.success && this.st >= T * 1.4) { this.state = 'splash'; this.st = 0; this.jy = 0; MG.sfx('hop'); this.fx.burst([me.p[0], 0.2, me.p[2]], 30, '#e0f4ff', 0.2, 34, 0.3, 0.01, 'alpha'); }
      } else if (this.state === 'land' || this.state === 'splash') {
        if (this.st > 70) { this.result = { won: this.success, score: this.success ? 100 : Math.round(this.jumpH / 12.3 * 100), dist: Math.round((this.jumpDist || 0) * 100) / 100 }; this.done = true; }
      }
    }
    bot() { if (this.state === 'swim' && this.t > 30 && this.t % 2 === 0) return ['square']; if (this.state === 'ready' && this.st > 10 && this.t % 2 === 0) return ['square']; return []; }
    render() {
      MG.sky('#4a90d8', '#d8ecf8');
      const me = this.me, jy = this.jy || 0;
      this.cam.set([me.p[0] * 0.5 + 3, 4 + jy * 0.6, me.p[2] + 11], [me.p[0] * 0.5 - 1, 2 + jy * 0.8, me.p[2] - 3], 50, 0.3, 200);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.8, 0.88, 0.96], near: 60, far: 160 }, light: { dir: [-0.4, -0.8, -0.3], color: [0.72, 0.7, 0.64], ambient: [0.48, 0.5, 0.56] } });
      this.cam.apply();
      GL.draw(this.env, null);
      MG.put(this.water, [Math.sin(this.t * 0.01) * 0.5, 0, 0], null, 1, { tint: [1, 1, 1, 0.5] });
      const bob = Math.sin(this.t * 0.08) * 0.08;
      // Cloud (swimming: only upper body above water)
      const cm = this.cloud;
      cm.onPose = (m) => { const b = (n) => m.b(n); if (this.state === 'jump' || this.state === 'land') { b('armL').rot[0] = -2.8; b('armR').rot[0] = -2.8; b('thighL').rot[0] = -0.4; } else { b('armL').rot[2] = 0.9 + Math.sin(this.t * 0.1) * 0.3; b('armR').rot[2] = -0.9 - Math.sin(this.t * 0.1) * 0.3; } };
      cm.update();
      const cy = this.state === 'land' ? 12.3 - 1.9 : (this.state === 'jump' ? jy : -1.1 + bob);
      MG.drawModel(cm, [me.p[0], cy, me.p[2]], Math.PI + 0.4);
      // Mr. Dolphin
      if (this.state !== 'swim') {
        const dm = this.dolphin;
        let dy = -2, pitch = 0;
        if (this.state === 'coming') dy = -2.5 + Math.min(1, this.st / 70) * 1.9;
        else if (this.state === 'ready') dy = -0.55 + bob;
        else if (this.state === 'jump') { dy = Math.min(jy * 0.5, 3) - (this.st > 30 ? (this.st - 30) * 0.12 : 0); pitch = -1.2 + this.st * 0.035; }
        else dy = -3;
        MG.put(dm.bones.root.meshes[0].mesh, [me.p[0], dy, me.p[2] + 0.3], [pitch, Math.PI + 0.4, 0], 1.3);
      }
      this.fx.draw();
      GL.end();
      if (this.state === 'swim') { R.window(W / 2 - 140, H - 56, 280, 42); R.text('Blow the whistle', W / 2 - 120 + ui.keys(['square'], W / 2 - 120, H - 35, 18) + 4, H - 45, { size: 15 }); }
      if (this.state === 'ready') { R.window(W / 2 - 140, H - 56, 280, 42); R.text('Jump!', W / 2 - 120 + ui.keys(['square'], W / 2 - 120, H - 35, 18) + 4, H - 45, { size: 15, color: '#ffe060' }); }
      if (this.state === 'land') ui.big('Made it!', 120, '#ffe060', 36);
      if (this.state === 'splash') ui.big('SPLASH!', 200, '#a0d0ff', 40);
    }
    resultTitle(r) { return r.won ? 'MADE IT TO THE TOP!' : 'TOO SHORT...'; }
    resultRows(r) { return [['Jump height', `${r.score}%`]]; }
  }
  MG.register('dolphin', {
    title: 'Mr. Dolphin',
    music: null,
    help: () => ({ title: 'MR. DOLPHIN', lines: ['Blow the whistle to call Mr. Dolphin, then blow it again to be thrown into the air.', 'You have to be in just the right spot to reach the top of the tower.'], controls: [[['up', 'down', 'left', 'right'], 'Swim'], [['square'], 'Whistle']] }),
    create: (opts) => new DolphinGame(opts),
  });

  // ================================================================== PARADE
  class ParadeGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.rating = 0; this.phase = 'join'; this.pt = 0;
      this.colX = 6; this.colV = 0.045;           // column marches toward -x
      this.gapIdx = 5;                             // Cloud's slot in the front (+z) row
      this.me = { x: 9, z: 5.5, step: 0 };
      this.beat = 36; this.cues = 0; this.cueHits = 0; this.bad = 0;
      this.marchLen = 60 * (opts.time || 32);
      this.soldier = MG.char('soldier'); this.soldier.scale = 1.3;
      this.cloudM = MG.char(opts.player || 'soldier'); this.cloudM.scale = 1.3;
      this.captain = MG.char('soldier_red'); this.captain.scale = 1.35;
      const rnd = MG.rng('junon-parade');
      this.env = MG.mesh(mb => {
        mb.floor(-200, -6, 200, 6, 0, '#5a5a62');
        for (let x = -200; x < 200; x += 8) mb.floor(x, -0.1, x + 4, 0.1, 0.01, '#c8c8c0');
        mb.floor(-200, 6, 200, 9, 0.2, '#8a8a90'); mb.floor(-200, -9, 200, -6, 0.2, '#8a8a90');
        // crowd behind barriers + buildings
        [-1, 1].forEach(sd => {
          for (let x = -200; x < 200; x += 1.1) { if (rnd() < 0.25) continue; const z = sd * (7 + rnd() * 1.6); mb.box(x, 0.8, z, 0.5, 1.2, 0.4, U.mix('#304060', '#a06040', rnd())); mb.sphere(x, 1.6, z, 0.2, 0.22, 0.2, '#e0b890', 5, 4, true); }
          mb.box(0, 0.5, sd * 6.3, 400, 0.8, 0.15, '#d0d0d0');
          for (let x = -200; x < 200; x += 14) { const h = 14 + rnd() * 20; mb.box(x, h / 2, sd * 16, 12, h, 8, U.mix('#606878', '#808898', rnd())); for (let k = 0; k < 8; k++) mb.box(x + (rnd() - 0.5) * 10, rnd() * h, sd * 12 - sd * 0.05, 1, 0.8, 0.1, '#ffe8a0'); }
          for (let x = -200; x < 200; x += 20) { mb.box(x, 4, sd * 9.5, 0.2, 8, 0.2, '#c0c0c0'); mb.box(x + 1.5, 7, sd * 9.5, 2.8, 1.6, 0.08, sd > 0 ? '#c02020' : '#2040c0'); }
        });
      });
    }
    slotX(i) { return this.colX + i * 1.6; }
    update(I) {
      this.t++; this.pt++; this.fx.update();
      const me = this.me;
      if (this.t % 3 === 0) this.fx.add([me.x + (Math.random() - 0.5) * 20, 8, (Math.random() - 0.5) * 10], [(Math.random() - 0.5) * 0.02, -0.02, 0], 200, ['#ff4040', '#40a0ff', '#ffe040', '#40e080'][this.t % 4], 0.08, 0.0002);
      if (this.t < MG.READY && this.phase === 'join') return;
      this.colX -= this.colV;
      const gx = this.slotX(this.gapIdx), gz = 1.6;
      if (this.phase === 'join') {
        const d = I.dir(), run = I.held('cancel') ? 0.1 : 0.05;
        me.x += d.x * run; me.z += d.y * run;
        me.z = U.clamp(me.z, -5.5, 5.8);
        me.moving = d.x || d.y;
        if (Math.hypot(me.x - gx, me.z - gz) < 0.45) {
          this.phase = 'march'; this.pt = 0; me.z = gz;
          this.rating += U.clamp(10 - this.joinT / 60, 0, 10) * 0.8;
          MG.sfx('confirm');
        }
        this.joinT = (this.joinT || 0) + 1;
        if (this.joinT > 60 * 15) { this.phase = 'march'; this.pt = 0; me.x = gx; me.z = gz; }      // the captain drags him into line
      } else if (this.phase === 'march') {
        const left = I.held('left');
        me.moving = left;
        if (left) me.x -= this.colV;
        const off = Math.abs(me.x - gx);
        if (left && off < 0.5) this.rating += 0.014; else if (off > 0.7) this.rating -= 0.012;
        if (off > 0.5 && I.held('right')) me.x += 0.02;
        // beat + "present arms" cues every 4 beats
        const b = Math.floor(this.pt / this.beat), inBeat = this.pt % this.beat;
        this.cue = b % 4 === 3 && b > 1 ? inBeat : -1;
        if (this.cue === 0) this.cues++;
        if (I.pressed('ok')) {
          const nearCue = b % 4 === 3 ? inBeat : b % 4 === 0 && b > 2 ? inBeat - this.beat : 999;
          if (Math.abs(nearCue) <= 10 && !this.hitThis) { this.rating += 2.4; this.cueHits++; this.hitThis = true; MG.sfx('ching', 0.6); this.flash = 16; }
          else { this.rating -= 1; this.bad++; MG.sfx('error', 0.4); }
        }
        if (b % 4 === 1) this.hitThis = false;
        this.present = b % 4 === 3 || (b % 4 === 0 && inBeat < 8);
        if (this.pt >= this.marchLen) { this.phase = 'end'; this.pt = 0; MG.sfx('item'); }
      } else if (this.phase === 'end') {
        if (this.pt > 90) { const score = Math.round(U.clamp(this.rating, 0, 100)); this.result = { won: score >= 30, score, cues: this.cueHits }; this.done = true; }
      }
      this.rating = U.clamp(this.rating, 0, 100);
      if (this.flash > 0) this.flash--;
    }
    bot() {
      if (this.t < MG.READY) return [];
      const me = this.me, out = [];
      if (this.phase === 'join') { const gx = this.slotX(this.gapIdx) - 0.3, gz = 1.6; if (me.x < gx - 0.2) out.push('right'); else if (me.x > gx + 0.2) out.push('left'); if (me.z < gz - 0.2) out.push('down'); else if (me.z > gz + 0.2) out.push('up'); out.push('cancel'); return out; }
      if (this.phase === 'march') {
        const gx = this.slotX(this.gapIdx);
        if (me.x > gx - 0.3) out.push('left');
        const inBeat = this.pt % this.beat, b = Math.floor(this.pt / this.beat);
        if (b % 4 === 3 && inBeat === 3) out.push('ok');
      }
      return out;
    }
    render() {
      MG.sky('#5a8ac8', '#d8e0e8');
      const me = this.me;
      const cx = (this.phase === 'join' ? (me.x + this.slotX(this.gapIdx)) / 2 : me.x);
      this.cam.set([cx - 2, 7.5, 13], [cx - 2, 0.8, 0], 45, 0.3, 300);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.82, 0.86, 0.9], near: 60, far: 180 }, light: { dir: [-0.3, -0.8, -0.4], color: [0.72, 0.7, 0.66], ambient: [0.48, 0.48, 0.52] } });
      this.cam.apply();
      GL.draw(this.env, null);
      // soldiers: two rows marching in step
      const s = this.soldier;
      const marchPhase = (this.colX * 1.4) % 1;
      s.play(this.present ? 'shoot' : 'walk', { restart: false }); s.t = this.present ? 12 : ((-this.colX / this.colV) % 32 + 32) % 32;
      s.onPose = null; s.update(0);
      for (let row = 0; row < 2; row++) for (let i = 0; i < 10; i++) {
        if (row === 1 && i === this.gapIdx) continue;
        MG.drawModel(s, [this.slotX(i), 0, row === 0 ? -1.6 : 1.6], -Math.PI / 2);
      }
      // captain leading
      this.captain.play('walk'); this.captain.t = s.t; this.captain.update(0);
      MG.drawModel(this.captain, [this.colX - 2.4, 0, 0], -Math.PI / 2);
      // Cloud
      const cm = this.cloudM;
      if (this.phase === 'march' && this.present) { cm.play('shoot'); cm.t = 12; }
      else if (me.moving) { cm.play(this.phase === 'join' && FF7.input && false ? 'run' : 'walk'); cm.t = (cm.t || 0) + 1; }
      else { cm.play('idle'); }
      cm.update(0);
      const face = this.phase === 'join' ? (me.moving ? Math.atan2(this.slotX(this.gapIdx) - me.x, 1.6 - me.z) : -Math.PI / 2) : -Math.PI / 2;
      MG.drawModel(cm, [me.x, 0, me.z], face, 0, 0, this.flash > 0 ? { add: [0.3, 0.3, 0.1] } : null);
      if (this.phase === 'join') { const q = [this.slotX(this.gapIdx), 0.05, 1.6]; MG.put(MG.SHADOW, q, null, [0.5, 1, 0.5], { unlit: true, blend: 'add', tint: [1, 0.9, 0.3, 0.3 + 0.2 * Math.sin(this.t * 0.2)] }); }
      this.fx.draw();
      GL.end();
      // HUD
      R.window(W - 190, 10, 178, 46);
      R.text('TV RATING', W - 178, 14, { size: 12, color: R.COL.cyan });
      R.text(`${Math.round(this.rating)}%`, W - 24, 24, { size: 22, align: 'right', weight: '700', color: '#ffe060' });
      if (this.phase === 'join') { R.window(12, 10, 300, 40); R.text('Get into the empty spot in line!', 24, 20, { size: 14 }); }
      if (this.phase === 'march') {
        R.window(12, 10, 220, 40);
        R.text('march', 24 + ui.keys(['left'], 24, 30, 16) + 4, 21, { size: 13 });
        R.text('on "NOW!"', 110 + ui.keys(['ok'], 110, 30, 16) + 4, 21, { size: 13 });
        const b = Math.floor(this.pt / this.beat);
        const n = (b % 4) + 1;
        R.text(String(n), W / 2, 70, { size: 34, weight: '800', align: 'center', color: n === 4 ? '#ffe060' : '#ffffff' });
        if (this.cue >= 0 && this.cue < 20) ui.big('NOW!', 130, '#ffe060', 40);
      }
      ui.readyGo(this.t, 190);
      if (this.phase === 'end') ui.big(`${Math.round(this.rating)}%`, 190, '#ffe060', 48);
    }
    resultTitle(r) { return 'TV AUDIENCE RATING'; }
    resultRows(r) { return [['Rating', `${r.score}%`, '#ffe060'], ['"Present arms!" in time', r.cues]]; }
  }
  MG.register('parade', {
    title: 'Rufus’ Welcoming Parade',
    music: () => 'rufus',
    help: () => ({ title: 'PARADE', lines: ['The welcoming parade for President Rufus is on TV! Run into the empty spot in the line, then march in step with the others.', `When the captain calls "NOW!", present arms with ${MG.btn('ok')}. The better you do, the higher the TV ratings.`], controls: [[['up', 'down', 'left', 'right'], 'Move'], [['cancel'], 'Hold to run'], [['left'], 'Hold to march'], [['ok'], 'Present arms']] }),
    create: (opts) => new ParadeGame(opts),
  });

  // ================================================================== THE SEND-OFF CEREMONY (Junon harbor)
  // The honor guard's rifle drill for President Rufus. The captain calls an order; on the beat the two soldiers beside
  // Cloud perform it, and so must he: its button, in time (a ring closes on the beat). Each move in step scores 10;
  // About face scores nothing, but facing the other way from the men beside you, none of your moves count (the
  // cancel button turns you round any time). "FINISH!": the victory pose, 30 if you're facing the right way.
  const SO_MOVES = [   // [button, name, the captain's call, the soldiers' animation]
    ['ok', 'Present arms', 'Present... ARMS!', 'shoot'],
    ['square', 'Shoulder arms', 'Shoulder... ARMS!', 'defend'],
    ['menu', 'Order arms', 'Order... ARMS!', 'nod'],
    ['cancel', 'About face', 'About... FACE!', null],
  ];
  const SO_CALL = 64, SO_WIN = 13;   // frames from the call to the beat; the window either side of it
  class SendoffGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      const rnd = MG.rng('junon-sendoff-' + (opts.seed || 0));
      this.orders = [];
      const n = 9 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) { let k = Math.floor(rnd() * 4.6); if (k > 3) k = 0; if (k === 3 && this.orders[i - 1] === 3) k = 1; this.orders.push(k); }
      this.i = -1; this.ct = 0; this.phase = 'drill';
      this.score = 0; this.inStep = 0; this.meUp = true; this.groupUp = true;
      this.mine = null; this.mineT = 0; this.theirs = null; this.theirT = 0; this.judged = true; this.fb = null;
      this.soldier = MG.char('soldier'); this.soldier.scale = 1.3;
      this.cloudM = MG.char(opts.player || 'soldier'); this.cloudM.scale = 1.3;
      this.captain = MG.char('soldier_red'); this.captain.scale = 1.35;
      this.rufus = MG.char('rufus'); this.rufus.scale = 1.3;
      this.heid = MG.char('heidegger'); this.heid.scale = 1.35;
      this.env = MG.mesh(mb => {
        mb.floor(-40, -20, 40, 20, 0, '#6a6a70');
        for (let x = -40; x < 40; x += 4) mb.floor(x, -20, x + 0.1, 20, 0.01, '#5a5a60');
        mb.floor(-40, -40, 40, -20, -1.5, '#2a4a6a');                         // the harbor water
        mb.box(0, 2.2, -24, 40, 4.4, 6, { side: '#4a4e58', front: '#5a5e68', top: '#3a3e48' });   // the cargo ship's hull
        mb.box(-6, 6, -24, 10, 3.6, 5, '#e8e8e8'); mb.box(8, 5.2, -24, 3, 2, 3, '#c83030');
        for (let x = -18; x <= 18; x += 3) { mb.box(x, 2, -16, 0.12, 4, 0.12, '#c8c8c8'); mb.box(x + 1.5, 3.4, -16, 2.6, 1.2, 0.05, x % 2 ? '#c02020' : '#2040c0'); }   // the bunting, behind the honor guard
      });
    }
    // the next order: called now, performed on the beat SO_CALL frames later
    next() {
      this.i++; this.ct = 0; this.judged = false;
      if (this.i >= this.orders.length) { this.phase = 'finish'; this.ct = 0; this.judged = false; MG.sfx('alarm_short', 0.4); }
    }
    judge(hit) {   // hit: pressed the right button in the window
      this.judged = true;
      const k = this.phase === 'finish' ? -1 : this.orders[this.i];
      if (!hit) { this.fb = { text: 'Out of step!', col: '#ff9090', t: 40 }; MG.sfx('error', 0.5); return; }
      if (k === 3) { this.inStep++; this.fb = { text: 'About face!', col: '#c0e0ff', t: 30 }; return; }   // (in step, but no points)
      if (this.meUp !== this.groupUp) { this.fb = { text: 'Facing the wrong way!', col: '#ffc080', t: 40 }; MG.sfx('error', 0.4); return; }
      const pts = k < 0 ? 30 : 10;
      this.score += pts; this.inStep++;
      this.fb = { text: k < 0 ? 'Magnificent!  +30' : 'In step!  +10', col: '#ffe060', t: 34 }; MG.sfx('ching', 0.6);
    }
    update(I) {
      this.t++; this.fx.update();
      if (this.fb && --this.fb.t <= 0) this.fb = null;
      if (this.mineT > 0) this.mineT--;
      if (this.theirT > 0) this.theirT--;
      if (this.over) { if (++this.over > 110) { this.result = { won: this.score >= 60, score: this.score, inStep: this.inStep, moves: this.orders.length }; this.done = true; } return; }
      if (this.t < MG.READY) return;
      if (this.i < 0) { if (this.t > MG.READY + 30) this.next(); return; }
      this.ct++;
      const beat = this.ct - SO_CALL;               // frames from the beat
      const want = this.phase === 'finish' ? 'ok' : SO_MOVES[this.orders[this.i]][0];
      // the player's buttons
      const pressed = ['ok', 'square', 'menu', 'cancel'].find(b => I.pressed(b));
      if (pressed) {
        if (pressed === 'cancel') { this.meUp = !this.meUp; MG.sfx('cursor', 0.4); }
        else { this.mine = this.phase === 'finish' && pressed === 'ok' ? 'victory' : SO_MOVES.find(m => m[0] === pressed)[3]; this.mineT = 30; }
        if (!this.judged && Math.abs(beat) <= SO_WIN) this.judge(pressed === want);
        else if (!this.judged && beat < -SO_WIN && pressed !== 'cancel') this.judge(false);   // (jumped the gun)
      }
      // the beat: the men beside Cloud do it
      if (beat === 0) {
        MG.sfx('hit', 0.35);
        if (this.phase === 'finish') { this.theirs = 'victory'; this.theirT = 80; FF7.audio.play('specialpose', { loop: false }); }   // ("The Special Pose!" fanfare)
        else { const k = this.orders[this.i]; if (k === 3) this.groupUp = !this.groupUp; else { this.theirs = SO_MOVES[k][3]; this.theirT = 30; } }
      }
      if (!this.judged && beat > SO_WIN) this.judge(false);
      if (this.phase === 'finish') { if (beat > 70) { this.over = 1; MG.sfx('levelup', 0.5); } }
      else if (beat > 30) this.next();
    }
    // the bot: the right button on the beat, and turns back round if it ever faces the wrong way
    bot() {
      if (this.t < MG.READY || this.over || this.i < 0) return [];
      const beat = this.ct - SO_CALL;
      if (this.phase === 'finish') return beat === 0 ? ['ok'] : [];
      if (beat === 0) return [SO_MOVES[this.orders[this.i]][0]];
      if (beat > SO_WIN + 2 && beat < 20 && this.meUp !== this.groupUp) return ['cancel'];
      return [];
    }
    render() {
      MG.sky('#6a98c8', '#dce4ea');
      this.cam.set([0, 3.4, 11.5], [0, 1.4, 0], 42, 0.3, 300);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.84, 0.88, 0.92], near: 40, far: 160 }, light: { dir: [-0.3, -0.8, -0.4], color: [0.74, 0.72, 0.68], ambient: [0.5, 0.5, 0.54] } });
      this.cam.apply();
      GL.draw(this.env, null);
      const pose = (m, anim, t0) => { if (anim) { m.play(anim, { restart: false }); m.t = Math.min(14, 30 - t0 + 2); } else m.play('idle', { restart: false }); m.onPose = null; m.update(anim ? 0 : 1); };
      // the honor guard: two lines down the pier (still), the two men beside Cloud (the drill)
      const s = this.soldier;
      pose(s, null, 0);
      for (let i = 0; i < 6; i++) { MG.drawModel(s, [-7.5 + i * 3, 0, -6], 0); MG.drawModel(s, [-7.5 + i * 3, 0, -12], Math.PI); }
      pose(s, this.theirT > 0 ? this.theirs : null, this.theirT);
      const face = (up) => up ? 0 : Math.PI;
      MG.drawModel(s, [-1.6, 0, 2], face(this.groupUp)); MG.drawModel(s, [1.6, 0, 2], face(this.groupUp));
      const cm = this.cloudM;
      pose(cm, this.mineT > 0 ? this.mine : null, this.mineT);
      MG.drawModel(cm, [0, 0, 2], face(this.meUp), 0, 0, this.fb && this.fb.col === '#ffe060' ? { add: [0.25, 0.22, 0.05] } : null);
      // the captain calling the drill; Rufus and Heidegger on the reviewing stand
      pose(this.captain, null, 0); MG.drawModel(this.captain, [4.5, 0, 3.2], -0.6);
      pose(this.rufus, null, 0); MG.drawModel(this.rufus, [-4.3, 0, 2.6], 1.7);   // (on the left, watching the drill)
      pose(this.heid, null, 0); MG.drawModel(this.heid, [-5.6, 0, 3.6], 1.8);
      this.fx.draw();
      GL.end();
      // the HUD: the call, the ring closing on the beat, the button for it, the score
      R.window(W - 170, 10, 158, 46);
      R.text('SCORE', W - 158, 14, { size: 12, color: R.COL.cyan });
      R.text(String(this.score), W - 24, 24, { size: 22, align: 'right', weight: '700', color: '#ffe060' });
      R.window(12, 10, 250, 46);
      R.text(`Order ${Math.max(0, Math.min(this.i + 1, this.orders.length))} / ${this.orders.length}`, 24, 14, { size: 12, color: R.COL.cyan });
      R.text('Turn round any time', 24 + ui.keys(['cancel'], 24, 42, 14) + 4, 34, { size: 12, color: R.COL.gray });
      if (this.i >= 0 && !this.over) {
        const fin = this.phase === 'finish', k = fin ? -1 : this.orders[this.i];
        const call = fin ? 'And... FINISH!' : SO_MOVES[k][2];
        const beat = this.ct - SO_CALL;
        if (beat < 26) {
          ui.big(call, 90, '#ffffff', 28);
          const cx = W / 2, cy = 168, c = R.ctx;
          const u = U.clamp(1 - this.ct / SO_CALL, 0, 1), r0 = 26, r = r0 + u * 90;
          c.save(); c.lineWidth = 4;
          c.strokeStyle = Math.abs(beat) <= SO_WIN ? '#ffe060' : 'rgba(255,255,255,0.8)';
          c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke();
          c.strokeStyle = 'rgba(255,224,96,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, r0, 0, Math.PI * 2); c.stroke();
          c.restore();
          ui.glyph(fin ? 'ok' : SO_MOVES[k][0], cx, cy, 30);
          R.text(fin ? 'Victory pose' : SO_MOVES[k][1], cx, cy + 40, { size: 14, align: 'center', color: '#e0e8ff' });
        }
      }
      if (this.fb) ui.big(this.fb.text, 300, this.fb.col, 24, Math.min(1, this.fb.t / 10));
      if (this.meUp !== this.groupUp && !this.over && (this.t >> 4) % 2) { R.window(W / 2 - 150, H - 58, 300, 40); R.text('Facing the wrong way! Turn round', W / 2 - 130 + ui.keys(['cancel'], W / 2 - 130, H - 38, 16) + 6, H - 47, { size: 14, color: '#ffc080' }); }
      ui.readyGo(this.t, 190);
      if (this.over) ui.big(`${this.score} points`, 190, '#ffe060', 40);
    }
    resultTitle(r) { return r.score >= 100 ? 'MAGNIFICENT!' : r.score >= 60 ? 'NOT BAD!' : 'SLOPPY!'; }
    resultRows(r) { return [['Moves in step', `${r.inStep} / ${r.moves + 1}`], ['Score', r.score, '#ffe060']]; }
  }
  MG.register('sendoff', {
    title: 'The Send-off Ceremony',
    music: () => 'rufus',
    help: () => ({ title: 'THE SEND-OFF CEREMONY', lines: ['The honor guard drills for President Rufus. When the captain calls an order, do it on the beat, together with the men beside you: the ring closes on the beat.', 'Facing the other way from them, your moves don’t count. Finish with a victory pose!'],
      controls: [[['ok'], 'Present arms'], [['square'], 'Shoulder arms'], [['menu'], 'Order arms'], [['cancel'], 'About face']] }),
    create: (opts) => new SendoffGame(opts),
  });

  // ================================================================== SHINRA HQ 60F: SNEAKING PAST THE GUARDS
  // The security floor, as in FF7: two guards patrol the far side of the corridor; at the ends of their beat (and
  // now and then in a glance, a "?" first) they stop and look into the room, their line of sight on the floor. Run
  // from statue to statue: crouched right behind one, they can't see you. From behind a statue or at the far door,
  // OK signals Barret and Tifa to run to you; they can be seen on the way too. Everyone at the far door: made it.
  // Tiles as the field map (js/maps/c4/part2.js shinra_60f): x along the corridor, z = the row.
  const SNK = { statues: [10, 15, 20, 25], start: 8.6, end: 28.6, rowMin: 2.6, rowMax: 7.3, walk: 0.055, run: 0.11, mate: 0.14 };
  class SneakGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.rnd = MG.rng('shinra-60f-' + (opts.seed || 0));
      this.me = { x: 8.4, z: 5.2, face: Math.PI / 2, moving: 0 };
      this.mates = [{ id: 'barret', x: 8.2, z: 6.4, to: null, at: 'start' }, { id: 'tifa', x: 8.2, z: 7.1, to: null, at: 'start' }];
      this.guards = [{ lo: 9, hi: 14, x: 11.5, dir: 1 }, { lo: 20, hi: 26, x: 23, dir: -1 }].map(g => Object.assign(g, { state: 'walk', t: 0, look: 0, warn: 0, glanceAt: 160 + Math.floor(this.rnd() * 300) }));
      this.cloudM = MG.char(opts.player || 'cloud'); this.cloudM.scale = 1.3;
      this.mateM = { barret: MG.char('barret'), tifa: MG.char('tifa') }; this.mateM.barret.scale = this.mateM.tifa.scale = 1.3;
      this.guardM = MG.char('soldier'); this.guardM.scale = 1.3;
      this.cone = MG.mesh(mb => mb.quad([-0.4, 0, 0], [0.4, 0, 0], [3.6, 0, 5.4], [-3.6, 0, 5.4], '#ffffff'), { unlit: true, cull: false });   // (a guard's line of sight)
      this.env = MG.mesh(mb => {
        mb.floor(7.5, 1.5, 30.5, 7.5, 0, '#e4e4ea');
        mb.floor(7.5, 4.6, 30.5, 5.4, 0.005, '#a01c22');                                  // the red runner
        mb.box(19, 1.6, 1.3, 23, 3.2, 0.4, { front: '#f4f4f6', side: '#d8d8dc', top: '#c8c8cc' });   // the back wall...
        for (let x = 11; x < 30; x += 7) mb.box(x, 1.9, 1.52, 2.4, 1.2, 0.04, '#6a90c0');            // ...its windows
        mb.box(19, 0.5, 7.7, 23, 1, 0.3, '#d0d0d6');                                       // the near wall (low: seen over)
        mb.box(7.3, 1.6, 4.5, 0.4, 3.2, 6.4, '#d8d8dc'); mb.box(30.7, 1.6, 4.5, 0.4, 3.2, 6.4, '#d8d8dc');
        mb.box(30.4, 1.2, 5, 0.1, 2.2, 1.2, '#4a4e58');                                    // the far door
        SNK.statues.forEach(x => {   // the golden statues of Shinra's founders
          mb.box(x, 0.3, 4, 0.9, 0.6, 0.9, '#6a5a3a');
          mb.prism(x, 0.6, 4, 0.22, 0.2, 0.9, 8, '#c8a040', true); mb.sphere(x, 1.65, 4, 0.18, 0.2, 0.18, '#d8b050', 8, 6);
          mb.box(x + 0.25, 1.35, 4.05, 0.5, 0.1, 0.1, '#c8a040');   // (the confident pointing arm)
        });
      });
    }
    // crouched behind a statue (right behind it, on the room's side) or by the doors at either end: out of sight
    hidden(p) { return p.x <= SNK.start + 0.2 || p.x >= SNK.end || SNK.statues.some(x => Math.abs(p.x - x) <= 0.5 && p.z >= 4.4 && p.z <= 5.9); }
    // can this guard see p? Looking into the room: a cone widening from the guard; walking: just the path ahead of him
    sees(g, p) {
      if (this.hidden(p)) return false;
      if (g.state === 'look') return p.z > 2.4 && Math.abs(p.x - g.x) <= 2.4 + (p.z - 2) * 0.6;
      return p.z < 3.3 && (p.x - g.x) * g.dir > 0 && Math.abs(p.x - g.x) < 2.2;
    }
    // frames until this guard next looks into the room (0: looking now)
    lookIn(g) {
      if (g.state === 'look') return 0;
      if (g.state === 'warn') return g.t;
      const toEnd = Math.abs((g.dir > 0 ? g.hi : g.lo) - g.x) / 0.03;
      return Math.min(toEnd, Math.max(0, g.glanceAt - this.t)) + 25;
    }
    signal() {
      const at = this.me.x >= SNK.end ? 'end' : SNK.statues.find(x => Math.abs(this.me.x - x) <= 0.5);
      if (at == null || this.mates.some(m => m.to)) { MG.sfx('error', 0.4); return; }
      this.mates.forEach((m, i) => {
        m.at = null;
        m.to = at === 'end' ? [SNK.end + 0.5 + i * 0.6, 5.6 + i * 0.7] : [at - 0.18 + i * 0.36, 5.1 + i * 0.6];
        m.dest = at;
      });
      this.waveT = 24; MG.sfx('cursor');
    }
    caught(who) { this.over = 1; this.win = false; this.spotted = who; MG.sfx('alarm_short', 0.6); }
    update(I) {
      this.t++; this.fx.update();
      if (this.waveT > 0) this.waveT--;
      if (this.over) { if (++this.over > 100) { this.result = { won: this.win, caught: !this.win, score: this.win ? 1 : 0, time: Math.round(this.t / 60) }; this.done = true; } return; }
      if (this.t < MG.READY) return;
      // the guards: walk the beat, stop at each end and look into the room; a glance now and then ("?" first)
      for (const g of this.guards) {
        if (g.state === 'walk') {
          g.x += g.dir * 0.03;
          const end = g.dir > 0 ? g.x >= g.hi : g.x <= g.lo;
          if (end || this.t >= g.glanceAt) { g.state = 'warn'; g.t = 26; if (!end) g.glance = true; }
        } else if (g.state === 'warn') { if (--g.t <= 0) { g.state = 'look'; g.t = g.glance ? 60 : 90 + Math.floor(this.rnd() * 50); } }
        else if (g.state === 'look') {
          if (--g.t <= 0) {
            g.state = 'walk';
            if (!g.glance) g.dir = -g.dir;
            g.glance = false;
            if (this.t >= g.glanceAt) g.glanceAt = this.t + 200 + Math.floor(this.rnd() * 320);
          }
        }
      }
      // Cloud
      const d = I.dir(), sp = I.held('cancel') ? SNK.walk : SNK.run, me = this.me;   // (run by default; hold cancel to creep)
      me.moving = 0;
      if (d.x || d.y) {
        const L = Math.hypot(d.x, d.y), nx = me.x + d.x / L * sp, nz = U.clamp(me.z + d.y / L * sp, SNK.rowMin, SNK.rowMax);
        const blocked = SNK.statues.some(x => Math.abs(nx - x) < 0.6 && Math.abs(nz - 4) < 0.6);
        if (!blocked) { me.x = U.clamp(nx, 8, 30); me.z = nz; }
        me.face = Math.atan2(d.x, d.y); me.moving = 1;
      }
      if (I.pressed('ok')) this.signal();
      // Barret and Tifa running to the spot
      for (const m of this.mates) {
        if (!m.to) continue;
        const dx = m.to[0] - m.x, dz = m.to[1] - m.z, L = Math.hypot(dx, dz);
        if (L < SNK.mate) { m.x = m.to[0]; m.z = m.to[1]; m.to = null; m.at = m.dest; }
        else { m.x += dx / L * SNK.mate; m.z += dz / L * SNK.mate; m.face = Math.atan2(dx, dz); }
      }
      // seen?
      for (const g of this.guards) {
        if (this.sees(g, me)) { this.caught('cloud'); g.spotting = true; return; }
        for (const m of this.mates) if (this.sees(g, m)) { this.caught(m.id); g.spotting = true; return; }
      }
      if (me.x >= SNK.end && this.mates.every(m => m.at === 'end')) { this.over = 1; this.win = true; MG.sfx('item'); }
    }
    // the bot: from hiding place to hiding place when neither guard will look in time; signals the two over at the
    // second statue and at the door
    bot() {
      if (this.t < MG.READY || this.over) return [];
      const me = this.me, stops = SNK.statues.map(x => [x, 5.15]).concat([[SNK.end + 0.4, 5.2]]);
      const k = stops.findIndex(p => p[0] > me.x + 0.3);
      const here = this.hidden(me) && (me.x < SNK.start + 0.3 || Math.abs(me.z - 5.15) < 0.2 || me.x >= SNK.end);
      const safe = Math.min(...this.guards.map(g => this.lookIn(g)));
      const mates = this.mates;
      if (here && !mates.some(m => m.to)) {
        const atStatue2 = Math.abs(me.x - 15) <= 0.5, atEnd = me.x >= SNK.end;
        const need = (atStatue2 && mates.every(m => m.at === 'start')) || (atEnd && mates.some(m => m.at !== 'end'));
        if (need) {
          const far = Math.max(...mates.map(m => Math.hypot((atEnd ? SNK.end + 0.5 : 15) - m.x, 5.3 - m.z)));
          return safe > far / SNK.mate + 30 && this.t % 4 === 0 ? ['ok'] : [];
        }
      }
      if (mates.some(m => m.to)) return [];      // (wait while they run)
      if (k < 0) return [];
      const [tx, tz] = stops[k];
      if (here) { const dist = Math.hypot(tx - me.x, tz - me.z); if (safe < dist / SNK.run + 25) return []; }
      const out = [];
      if (tx - me.x > 0.08) out.push('right'); else if (me.x - tx > 0.08) out.push('left');
      if (tz - me.z > 0.08) out.push('down'); else if (me.z - tz > 0.08) out.push('up');
      return out;
    }
    render() {
      const me = this.me;
      MG.sky('#1a1a22', '#3a3a44');
      const cx = U.clamp(me.x, 12, 26);
      this.cam.set([cx, 8.6, 12.4], [cx, 0.6, 4.2], 44, 0.3, 200);
      GL.begin({ clear: [0, 0, 0, 0], fog: null, light: { dir: [-0.2, -0.9, -0.3], color: [0.78, 0.76, 0.72], ambient: [0.5, 0.5, 0.54] } });
      this.cam.apply();
      GL.draw(this.env, null);
      // the guards' line of sight while they look into the room
      for (const g of this.guards) if (g.state === 'look') {
        const a = g.spotting ? 0.5 : 0.22;
        MG.put(this.cone, [g.x, 0.03, 2.3], null, 1, { unlit: true, blend: 'alpha', tint: [1, 0.9, 0.3, a] });
      }
      const draw = (m, x, z, yaw, anim, crouch, t) => {
        m.play(anim, { restart: false }); m.onPose = crouch ? (mm) => { mm.b('hips').pos[1] -= 0.12; mm.b('thighL').rot[0] = -1.2; mm.b('thighR').rot[0] = -1.2; mm.b('shinL').rot[0] = 1.6; mm.b('shinR').rot[0] = 1.6; } : null;
        m.update(t || 1); MG.shadow(x, 0, z, 0.35); MG.drawModel(m, [x, 0, z], yaw);
      };
      for (const g of this.guards) draw(this.guardM, g.x, 2.3, g.state === 'walk' ? (g.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : 0, g.state === 'walk' ? 'walk' : 'idle', false);
      for (const m of this.mates) draw(this.mateM[m.id], m.x, m.z, m.to ? m.face : Math.PI, m.to ? 'run' : 'idle', !m.to && this.hidden(m));
      draw(this.cloudM, me.x, me.z, me.moving ? me.face : Math.PI, this.waveT > 0 ? 'wave' : me.moving ? 'run' : 'idle', !me.moving && this.hidden(me) && this.waveT <= 0);
      this.fx.draw();
      GL.end();
      // the guards' "?" and "!"
      for (const g of this.guards) {
        const q = this.cam.project([g.x, 2.4, 2.3]); if (!q.visible) continue;
        if (g.spotting) R.text('!', q.x, q.y - 30, { size: 30, weight: '800', align: 'center', color: '#ff4040' });
        else if (g.state === 'warn') R.text('?', q.x, q.y - 26, { size: 24, weight: '800', align: 'center', color: '#ffe060' });
      }
      // what to do
      R.window(12, 10, 300, 46);
      const hid = this.hidden(me);
      R.text(hid ? 'Hidden' : 'In the open!', 24, 14, { size: 13, color: hid ? '#80ff90' : '#ffb080' });
      R.text('Signal Barret and Tifa', 24 + ui.keys(['ok'], 24, 42, 14) + 4, 34, { size: 12, color: R.COL.gray });
      const n = this.mates.filter(m => m.at === 'end').length;
      R.window(W - 190, 10, 178, 46); R.text('At the door', W - 178, 14, { size: 12, color: R.COL.cyan }); R.text(`${(me.x >= SNK.end ? 1 : 0) + n} / 3`, W - 24, 24, { size: 20, align: 'right', weight: '700' });
      ui.readyGo(this.t, 190);
      if (this.over) ui.big(this.win ? 'Made it!' : 'Spotted!', 190, this.win ? '#ffe060' : '#ff8080', 36);
    }
    resultTitle(r) { return r.won ? 'MADE IT!' : 'SPOTTED!'; }
    resultRows(r) { return [['Time', `${r.time}s`]]; }
  }
  MG.register('shinra_sneak', {
    title: 'Shinra HQ 60F',
    music: () => 'infiltrate',
    help: () => ({ title: 'THE SECURITY FLOOR', lines: ['Get past the guards to the far door. When a guard stops and looks into the room ("?" first), crouch right behind a golden statue.', `From behind a statue, or at the door, signal Barret and Tifa with ${MG.btn('ok')}: they run to you, so pick your moment.`],
      controls: [[['up', 'down', 'left', 'right'], 'Run (hold ' + MG.btn('cancel') + ' to creep)'], [['ok'], 'Signal Barret and Tifa']] }),
    create: (opts) => new SneakGame(opts),
  });

  // ================================================================== GAEA'S CLIFF
  // Three climbs up the frozen face (opts.stage 1..3), as in FF7: the cracks fork (◀ / ▶ at a fork picks one) and some
  // run out in bare ice (climb back down). The cold keeps lowering body temperature, faster in a gust and on the later
  // climbs; OK and Square one after the other rub the hands warm (not while climbing). Below 26° the climber passes out.
  const CLIMB_STAGES = [null,
    { seed: 'gaea-1', steps: 9, forks: [3], dead: 2, drain: 0.0100, gust: 0.003 },
    { seed: 'gaea-2', steps: 11, forks: [3, 7], dead: 2, drain: 0.0112, gust: 0.004 },
    { seed: 'gaea-3', steps: 13, forks: [2, 6, 10], dead: 3, drain: 0.0124, gust: 0.005 }];
  class ClimbGame {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.temp = 37; this.warm = 0; this.lastWarm = null; this.gust = 0; this.time = 0;
      const ST = this.st = CLIMB_STAGES[U.clamp(opts.stage || 1, 1, 3)];
      const rnd = MG.rng(ST.seed);
      // the cracks: a tree of holds. The main line runs to the top; at a fork a second crack leaves the same hold
      // for the other side and runs out after a few holds
      const N = this.nodes = [{ x: 0, y: 0.5, up: [], down: null, main: true }];
      const add = (from, x, y, o) => { const n = Object.assign({ x, y, up: [], down: from }, o); N.push(n); N[from].up.push(N.length - 1); return N.length - 1; };
      let cur = 0;
      for (let i = 1; i <= ST.steps; i++) {
        const p = N[cur];
        const x = U.clamp(p.x + (rnd() - 0.5) * 7, -6, 6), y = p.y + 3 + rnd() * 1.6;
        const nx = add(cur, x, y, { main: true, goal: i === ST.steps });
        if (ST.forks.includes(i)) {   // a crack off the other way that goes nowhere
          const side = x >= p.x ? -1 : 1;
          let d = cur, dx = p.x;
          for (let k = 0; k < ST.dead; k++) { dx = U.clamp(dx + side * (2.6 + rnd() * 1.4), -10, 10); d = add(d, dx, N[d].y + 2.6 + rnd() * 1.2, { deadEnd: k === ST.dead - 1 }); }
        }
        cur = nx;
      }
      this.top = N[cur].y;
      this.a = 0; this.b = N[0].up[0]; this.u = 0;          // on the crack from hold a up to hold b, u = 0..1 along it
      this.cloud = MG.char(opts.player || 'cloud'); this.cloud.scale = 1.5;
      this.env = MG.mesh(mb => {
        // icy cliff face (z = 0 plane, facing +z) with bumps
        for (let i = -16; i < 16; i += 2) for (let j = -2; j < this.top + 8; j += 2) {
          const zz = (a, b) => 0.6 * Math.sin(a * 0.9 + b * 0.7) + 0.4 * Math.cos(a * 1.7 - b * 0.4);
          const c = U.mix('#8aa0bc', '#dce8f6', (Math.sin(i * 1.3 + j * 0.8) + 1) / 2 * 0.7);
          mb.quad([i, j, zz(i, j)], [i + 2, j, zz(i + 2, j)], [i + 2, j + 2, zz(i + 2, j + 2)], [i, j + 2, zz(i, j + 2)], c);
        }
        N.forEach((b) => {
          if (b.down == null) return;
          const a = N[b.down], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(L / 0.6);
          for (let k = 0; k < n; k++) mb.box(U.lerp(a.x, b.x, k / n), U.lerp(a.y, b.y, k / n), 0.7, 0.35, 0.35, 0.15, '#3a4a60');
          if (b.deadEnd) mb.sphere(b.x, b.y + 0.4, 0.75, 0.7, 0.9, 0.2, '#f4f8ff', 8, 5);   // (the crack runs out in smooth ice)
        });
        mb.floor(-20, 0, 20, 12, -2, '#e8f0f8');
        mb.floor(-20, -6, 20, 0.8, this.top + 1, '#f4f8ff');     // the top ledge
      });
      this.mountains = MG.mesh(mb => { for (let i = 0; i < 14; i++) { const x = -150 + i * 23, h = 40 + (i * 37 % 50); mb.prism(x, -30, -120 - (i % 3) * 20, 25, 0, h, 5, '#8a9ab8'); mb.prism(x, -30 + h * 0.6, -120 - (i % 3) * 20, 10, 0, h * 0.4, 5, '#f0f4fa'); } });
    }
    pos() { const a = this.nodes[this.a], b = this.nodes[this.b]; return [U.lerp(a.x, b.x, this.u), U.lerp(a.y, b.y, this.u)]; }
    len() { const a = this.nodes[this.a], b = this.nodes[this.b]; return Math.max(0.1, Math.hypot(b.x - a.x, b.y - a.y)); }
    atFork() { return this.u >= 1 && this.nodes[this.b].up.length > 1; }
    atDeadEnd() { return this.u >= 1 && !!this.nodes[this.b].deadEnd; }
    // a step along the cracks: +d up, -d down (reaching a hold carries the rest of the step on)
    step(d) {
      const N = this.nodes;
      this.u += d / this.len();
      if (this.u >= 1) {
        const b = N[this.b];
        if (b.goal) { this.u = 1; this.over = 1; this.win = true; MG.sfx('item'); return; }
        if (b.up.length === 1) { const rest = (this.u - 1) * this.len(); this.a = this.b; this.b = b.up[0]; this.u = rest / this.len(); }
        else this.u = 1;   // (a fork waits for left / right; a dead end goes no further)
      } else if (this.u <= 0) {
        const a = N[this.a];
        if (a.down == null) this.u = 0;
        else { const rest = -this.u * this.len(); this.b = this.a; this.a = a.down; this.u = 1 - rest / this.len(); }
      }
    }
    pick(dir) {   // at a fork: the crack to the left (-1) or the right (+1)
      const b = this.nodes[this.b], ups = b.up.slice().sort((p, q) => this.nodes[p].x - this.nodes[q].x);
      this.a = this.b; this.b = dir < 0 ? ups[0] : ups[ups.length - 1]; this.u = 0.02; MG.sfx('cursor');
    }
    update(I) {
      this.t++; this.fx.update();
      const P = this.pos();
      if (this.t % 2 === 0) this.fx.add([(Math.random() - 0.5) * 30 + 15, P[1] + (Math.random() - 0.3) * 10, 3 + Math.random() * 3], [-0.12 - (this.gust > 0 ? 0.15 : 0), -0.01, 0], 120, '#ffffff', 0.06, 0, 'alpha');
      if (this.over) { if (++this.over > 90) { this.result = { won: this.win, score: Math.round(this.temp * 10) / 10, temp: Math.round(this.temp * 10) / 10, time: Math.round(this.time / 60) }; this.done = true; } return; }
      if (this.t < MG.READY) return;
      this.time++;
      // the cold
      if (this.gust > 0) this.gust--; else if (Math.random() < this.st.gust) { this.gust = 120; MG.sfx('search', 0.4); }
      this.temp -= this.st.drain + (this.gust > 0 ? 0.012 : 0);
      // warming up: OK and Square one after the other
      const o = I.pressed('ok'), sq = I.pressed('square');
      if (o || sq) {
        const b = o ? 'ok' : 'square';
        this.temp += b !== this.lastWarm ? 0.3 : 0.08;
        this.lastWarm = b; this.warm = 20;
      }
      if (this.warm > 0) this.warm--;
      this.temp = Math.min(38, this.temp);
      // climbing
      const d = I.dir();
      this.moving = 0;
      if (this.warm <= 0) {
        if (this.atFork() && (I.pressed('left') || I.pressed('right'))) this.pick(I.pressed('left') ? -1 : 1);
        else if (d.y < 0 && !this.atFork() && !this.atDeadEnd()) { this.step(0.05); this.moving = 1; }
        else if (d.y > 0) { this.step(-0.05); this.moving = -1; }
      }
      if (!this.over && this.temp < 26) { this.over = 1; this.win = false; MG.sfx('falling'); }
    }
    // the bot: warms up below 30.5° (to 36.5°), takes the main crack at each fork, climbs
    bot() {
      if (this.t < MG.READY || this.over) return [];
      if (this.temp < 30.5 || (this.warming && this.temp < 36.5)) { this.warming = true; return this.t % 4 === 0 ? ['ok'] : this.t % 4 === 2 ? ['square'] : []; }
      this.warming = false;
      if (this.atFork()) { const b = this.nodes[this.b], main = b.up.find(i => this.nodes[i].main); return this.t % 6 === 0 ? [this.nodes[main].x < b.x ? 'left' : 'right'] : []; }
      if (!this.nodes[this.b].main) return ['down'];
      return ['up'];
    }
    render() {
      MG.sky('#6a88b8', '#e0e8f4');
      const p = this.pos();
      this.cam.set([p[0] * 0.7 + 2, p[1] + 1.5, 10], [p[0] * 0.8, p[1] + 1.2, 0], 48, 0.3, 300);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.86, 0.9, 0.96], near: 30, far: 200 }, light: { dir: [-0.4, -0.6, -0.6], color: [0.7, 0.72, 0.78], ambient: [0.5, 0.54, 0.62] } });
      this.cam.apply();
      MG.put(this.mountains, [0, p[1] * 0.6, 0]);
      GL.draw(this.env, null);
      const cm = this.cloud;
      const blue = U.clamp((37 - this.temp) / 11, 0, 1);
      cm.onPose = (m) => {
        if (this.over && !this.win) { m.b('armL').rot[0] = 0.4; m.b('armR').rot[0] = 0.4; return; }
        if (this.warm > 0) { const k = Math.sin(this.t * 0.8) * 0.4; m.b('armL').rot[0] = -1.4; m.b('armR').rot[0] = -1.4; m.b('armL').rot[1] = -0.8 + k; m.b('armR').rot[1] = 0.8 - k; m.b('foreL').rot[1] = -1.2; m.b('foreR').rot[1] = 1.2; return; }
        const s = this.moving ? Math.sin(this.t * 0.25) : 0;
        m.b('armL').rot[0] = -2.7 + s * 0.4; m.b('armR').rot[0] = -2.7 - s * 0.4;
        m.b('thighL').rot[0] = -0.6 - s * 0.4; m.b('thighR').rot[0] = -0.6 + s * 0.4; m.b('shinL').rot[0] = 0.8; m.b('shinR').rot[0] = 0.8;
      };
      cm.update();
      const fall = this.over && !this.win ? Math.min(12, (this.over / 10) * (this.over / 10)) : 0;
      MG.drawModel(cm, [p[0], p[1] - 0.8 - fall, 0.9], Math.PI, 0, 0, { tint: [1 - blue * 0.3, 1 - blue * 0.15, 1, 1] });
      this.fx.draw();
      GL.end();
      // the thermometer
      R.window(W - 96, 60, 80, 290);
      R.text('TEMP', W - 56, 66, { size: 12, align: 'center', color: R.COL.cyan });
      const f = U.clamp((this.temp - 20) / 20, 0, 1), top = 92, hh = 200;
      const c = R.ctx;
      c.fillStyle = '#202030'; c.fillRect(W - 66, top, 20, hh);
      c.fillStyle = this.temp < 28 ? ((this.t >> 3) % 2 ? '#4060ff' : '#80a0ff') : this.temp < 32 ? '#60a0ff' : '#ff6040'; c.fillRect(W - 66, top + hh * (1 - f), 20, hh * f);
      c.fillStyle = '#ff4040'; c.fillRect(W - 72, top + hh * (1 - (26 - 20) / 20), 32, 2);
      R.text(`${this.temp.toFixed(1)}°`, W - 56, top + hh + 10, { size: 16, align: 'center', weight: '700', color: this.temp < 28 ? '#80a0ff' : '#ffffff' });
      R.window(12, 10, 150, 40); R.text('HEIGHT', 22, 15, { size: 12, color: R.COL.cyan }); R.bar(22, 34, 128, 6, U.clamp(p[1] / this.top, 0, 1), '#80b0ff', '#ffffff');
      // what to do now
      const tip = (text, keys) => { R.window(W / 2 - 180, H - 60, 360, 44); const kw = keys ? ui.keys(keys, W / 2 - 160, H - 38, 16) + 8 : 0; R.text(text, W / 2 - 160 + kw, H - 48, { size: 15, color: '#e0e8ff' }); };
      if (!this.over && this.t > MG.READY) {
        if (this.temp < 30 && (this.t >> 4) % 2) tip('Too cold! Rub your hands warm', ['ok', '/', 'square']);
        else if (this.atFork()) tip('The crack forks. Pick one', ['left', '/', 'right']);
        else if (this.atDeadEnd()) tip('Nothing but ice. Climb back down', ['down']);
      }
      if (this.gust > 0 && !this.over) R.text('A freezing wind blows...', W / 2, 60, { size: 14, align: 'center', color: '#d0e0ff' });
      ui.readyGo(this.t, 190);
      if (this.over) ui.big(this.win ? 'Made it!' : 'Passed out...', 190, this.win ? '#ffe060' : '#a0c0ff', 34);
    }
    resultTitle(r) { return r.won ? 'CLIMBED IT!' : 'PASSED OUT...'; }
    resultRows(r) { return [['Body temperature', `${r.temp.toFixed(1)}°`], ['Time', `${r.time}s`]]; }
  }
  MG.register('wall_climb', {
    title: 'Gaea’s Cliff',
    music: null,
    help: () => ({ title: 'GAEA’S CLIFF', lines: ['Climb the frozen cliff along the cracks. Where a crack forks, pick one: some just run out in ice. The cold keeps lowering your body temperature.', `Below 26° you pass out! Press ${MG.btn('ok')} and ${MG.btn('square')} one after the other to rub your hands warm.`], controls: [[['up', '/', 'down'], 'Climb up / down'], [['left', '/', 'right'], 'Pick a crack at a fork'], [['ok', '+', 'square'], 'Alternate to warm up']] }),
    create: (opts) => new ClimbGame(opts),
  });
})();
