// Wonder Square's arcade games (the Gold Saucer, js/maps/c6a/part3.js), each a real game rather than a roll:
//   arm_wrestle  the Wrestler's table: alternate ○ and □ to force his fist down; brace through his surges
//   catcher      Wonder Catcher: steer the claw over a plush, drop it, and hope the grip holds on the way up
//   battler      3-D Battler: a five-fighter ladder. Read the height of each attack, guard it, then punish
// Results: arm_wrestle { won, time }, catcher { won, prize: kind, name }, battler { won, beaten, gp }
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const label = (cam, p, text, col, size) => { const q = cam.project(p); if (q.visible) R.text(text, q.x, q.y, { size: size || 16, align: 'center', color: col || '#ffffff', weight: '700' }); };
  const neon = (text, pos, size, col) => MG.mesh(mb => FF7.field.text3d(mb, text, { pos, size, col, w: 0.2 }), { unlit: true });

  // ================================================================== ARM WRESTLING
  // Both wrestlers' right arms are posed so their hands really meet over the table and tilt together: the arm and
  // torso angles are solved once per pair of models (a small coordinate search toward the clasp point, the elbow
  // kept on its pad), at eleven balance points, and blended in between.
  const AW = {
    TABLE: 0.84, L: 0.17, TILT: 1.0, N: 11, PUSH: 0.06, TIME: 60 * 30,
    foes: {
      sumo: { name: 'Sumo Wrestler', force: 0.0038, surge: 2.3, gap: [170, 300],
        app: { base: 'man', build: 'fat', top: '#e8b088', sleeve: 'skin', bottom: '#3a2a6a', hair: '#141010', hairStyle: 'bun', skin: '#e8b088' } },
      wrestler: { name: 'Wrestler', force: 0.0060, surge: 2.8, gap: [120, 230],
        app: { base: 'man', build: 'big', top: '#f0c8a0', sleeve: 'skin', bottom: '#c03030', hairStyle: 'buzz' } },
    },
  };
  const awCache = {};
  function awPose(m, p) {
    const b = (n) => m.b(n);
    b('torso').rot[0] = p[4]; b('torso').rot[1] = p[5]; b('torso').rot[2] = p[6]; b('head').rot[0] = -0.3;
    b('armR').rot[0] = p[0]; b('armR').rot[1] = p[1]; b('armR').rot[2] = p[2]; b('foreR').rot[0] = p[3];
    b('armL').rot[0] = -1.15; b('armL').rot[2] = -0.25; b('foreL').rot[0] = -0.9;         // the free hand braced on the table
    b('thighL').rot[0] = -0.15; b('thighR').rot[0] = 0.2;                                  // a braced stance
  }
  // side -1: the player (on the left, facing +x); +1: the opponent. Balance +1 = the player wins: the clasp goes to
  // the player's left (-z), the way a right-handed pin goes
  function awSolve(m, side) {
    const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
    const elbow = [side * 0.09, AW.TABLE + 0.02, -side * 0.03], out = [];
    let p = [-1.2, 0, -0.3, -1.5, 0.42, 0, 0];
    for (let i = 0; i < AW.N; i++) {
      const th = -(-1 + 2 * i / (AW.N - 1)) * AW.TILT, tgt = [0, AW.TABLE + AW.L * Math.cos(th), AW.L * Math.sin(th)];
      const cost = (q) => {
        awPose(m, q); m.computeWorld();
        return d2(m.worldPoint('handR', [0, 0, 0]), tgt) + 0.12 * d2(m.worldPoint('foreR', [0, 0, 0]), elbow)
          + 0.002 * (q[1] * q[1] + q[2] * q[2]) + 0.004 * ((q[4] - 0.42) ** 2 + q[5] ** 2 + q[6] ** 2);
      };
      let c = cost(p);
      for (let step = 0.3; step > 0.002; step *= 0.6) {
        for (let guard = 0, better = true; better && guard < 40; guard++) {
          better = false;
          for (let j = 0; j < 7; j++) for (const s of [step, -step]) { const q = p.slice(); q[j] += s; const cq = cost(q); if (cq < c) { c = cq; p = q; better = true; } }
        }
      }
      out.push(p.slice());
    }
    return out;
  }
  const awBlend = (tab, v) => { const f = (clamp(v, -1, 1) + 1) / 2 * (AW.N - 1), i = Math.min(AW.N - 2, Math.floor(f)), k = f - i; return tab[i].map((x, j) => lerp(x, tab[i + 1][j], k)); };

  class ArmWrestle {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.foeId = AW.foes[opts.foe] ? opts.foe : 'sumo'; this.foe = AW.foes[this.foeId];
      this.pid = opts.player || 'cloud';
      this.me = MG.char(this.pid); this.them = MG.char(this.foe.app);
      [[this.me, -0.4, Math.PI / 2], [this.them, 0.42, -Math.PI / 2]].forEach(([m, x, yaw]) => { m.scale = 1.6; m.position = [x, m.baseY || 0, 0]; m.rotY = yaw; if (m.update) m.update(0); });
      const key = this.pid + '|' + this.foeId;
      if (!awCache[key]) awCache[key] = { me: awSolve(this.me, -1), them: awSolve(this.them, 1) };
      this.poses = awCache[key];
      this.bal = 0; this.shown = 0; this.next = 'ok'; this.time = 0; this.surge = null;
      this.nextSurge = this.foe.gap[0] + U.rand(this.foe.gap[1] - this.foe.gap[0]);
      const T = AW.TABLE;
      this.env = MG.mesh(mb => {
        mb.floor(-5, -4, 5, 4, 0, '#4a1440');
        for (let i = -5; i <= 5; i++) { mb.floor(i - 0.01, -4, i + 0.01, 4, 0.002, '#6a2860'); mb.floor(-5, i * 0.8 - 0.01, 5, i * 0.8 + 0.01, 0.002, '#6a2860'); }
        mb.box(0, 2, -2.6, 10, 4, 0.2, '#1c1030');
        // the table: a heavy top, elbow pads (yours blue, his red), grip pegs for the free hands, legs and a base
        mb.box(0, T - 0.04, 0, 0.62, 0.06, 0.62, { top: '#3a3a46', side: '#24242c' });
        mb.prism(-0.09, T - 0.01, 0.03, 0.07, 0.07, 0.025, 10, '#3050c0'); mb.prism(0.09, T - 0.01, -0.03, 0.07, 0.07, 0.025, 10, '#c03030');
        [[-0.22, -0.22], [0.22, 0.22]].forEach(([x, z]) => mb.prism(x, T - 0.01, z, 0.02, 0.02, 0.14, 6, '#c8ccd0', true));
        [[-0.26, -0.26], [0.26, -0.26], [-0.26, 0.26], [0.26, 0.26]].forEach(([x, z]) => mb.box(x, (T - 0.07) / 2, z, 0.05, T - 0.07, 0.05, '#1a1a20'));
        mb.box(0, 0.03, 0, 0.7, 0.06, 0.7, '#202028');
      });
      this.glow = MG.mesh(mb => {
        [-3.5, 3.5].forEach(x => mb.box(x, 2, -2.48, 0.06, 3.4, 0.02, '#ff40c0'));
        mb.box(0, 3.55, -2.48, 7, 0.06, 0.02, '#40e0ff');
        FF7.field.text3d(mb, 'ARM WRESTLING', { pos: [0, 3.05, -2.47], size: 0.42, col: '#ffe060', w: 0.2 });
      }, { unlit: true });
      this.clasp = MG.mesh(mb => { mb.sphere(-0.025, 0, 0, 0.055, 0.06, 0.055, '#6a4a34', 7, 5, true); mb.sphere(0.03, 0, 0, 0.06, 0.065, 0.06, '#e0b088', 7, 5, true); });
    }
    begin() { }
    update(I) {
      this.t++; this.fx.update();
      this.shown = lerp(this.shown, this.bal, 0.22);
      if (this.over) { if (++this.over > 100) { this.result = { won: this.won, time: Math.round(this.time / 60), score: this.won ? 1 : 0 }; this.done = true; } return; }
      if (this.t < MG.READY) return;
      this.time++;
      if (this.pushT > 0) this.pushT--; if (this.miss > 0) this.miss--;
      // you: the two buttons in turn (the same one twice slips)
      const p = I.pressed('ok') ? 'ok' : I.pressed('square') ? 'square' : null;
      if (p) {
        if (p === this.next) { this.bal += AW.PUSH; this.next = p === 'ok' ? 'square' : 'ok'; this.pushT = 6; }
        else { this.bal -= 0.012; this.miss = 20; MG.sfx('error', 0.3); }
      }
      // him: a steady pull that ebbs and flows, and now and then a surge (a moment's warning, then a heave)
      let f = this.foe.force * (0.85 + 0.3 * Math.sin(this.time * 0.045));
      if (!this.surge && this.time >= this.nextSurge) this.surge = { t: 0, warn: 45, len: 60 };
      if (this.surge) {
        const s = this.surge; s.t++;
        if (s.t === s.warn + 1) { MG.sfx('hit', 0.6); s.on = true; }
        if (s.on) f *= this.foe.surge;
        if (s.t > s.warn + s.len) { this.surge = null; this.nextSurge = this.time + this.foe.gap[0] + U.rand(this.foe.gap[1] - this.foe.gap[0]); }
      }
      this.bal -= f;
      if (this.bal >= 1 || this.bal <= -1 || this.time >= AW.TIME) {
        this.bal = clamp(this.bal, -1, 1); this.won = this.bal > 0; this.over = 1; this.surge = null;
        MG.sfx(this.won ? 'levelup' : 'hit');
        const th = -this.bal * AW.TILT; this.fx.burst([0, AW.TABLE + 0.02, AW.L * Math.sin(th) * 1.1], 14, '#fff0c0', 0.03, 24, 0.05, 0.002);
      }
    }
    bot() { return this.t >= MG.READY && !this.over && this.t % (this.opts.botRate || 9) === 0 ? [this.next] : []; }
    render() {
      MG.sky('#2a1030', '#0a0610');
      const sh = this.surge && this.surge.on ? (Math.random() - 0.5) * 0.03 : 0;
      this.cam.set([-2.05 + sh, 2.25, 2.35], [0.05, 0.84, 0], 40, 0.1, 60);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.85, -0.45], color: [0.85, 0.78, 0.72], ambient: [0.45, 0.4, 0.48] } });
      this.cam.apply();
      GL.draw(this.env, null); GL.draw(this.glow, null);
      const pm = awBlend(this.poses.me, this.shown), pt = awBlend(this.poses.them, this.shown);
      this.me.onPose = (m) => awPose(m, pm); this.them.onPose = (m) => awPose(m, pt);
      this.me.update(); this.them.update();
      MG.shadow(-0.4, 0.06, 0, 0.3, 0.3); MG.shadow(0.42, 0.06, 0, 0.36, 0.3);
      MG.drawModel(this.me, [-0.4, 0, 0], Math.PI / 2);
      MG.drawModel(this.them, [0.42, 0, 0], -Math.PI / 2, 0, 0, this.surge && this.surge.on && (this.t >> 2) % 2 ? { add: [0.35, 0.05, 0.05] } : null);
      const th = -this.shown * AW.TILT;
      MG.put(this.clasp, [0, AW.TABLE + AW.L * Math.cos(th), AW.L * Math.sin(th)], [th, 0, 0], 1);
      this.fx.draw();
      GL.end();
      // the balance: your side blue, his red; the marker is where the fists are
      R.window(W / 2 - 180, 8, 360, 62);
      R.text(FF7.state && FF7.state.chars && FF7.state.chars[this.pid] ? FF7.state.chars[this.pid].name.toUpperCase() : 'YOU', W / 2 - 166, 14, { size: 14, color: '#80b0ff' });
      R.text(this.foe.name.toUpperCase(), W / 2 + 166, 14, { size: 14, color: '#ff9080', align: 'right' });
      R.text(String(Math.ceil(Math.max(0, AW.TIME - this.time) / 60)), W / 2, 12, { size: 16, align: 'center', weight: '700' });
      const bx = W / 2 - 150, by = 42, c = R.ctx;
      c.fillStyle = '#10101c'; c.fillRect(bx, by, 300, 12);
      c.fillStyle = 'rgba(80,130,255,0.55)'; c.fillRect(bx, by, 150, 12); c.fillStyle = 'rgba(255,90,70,0.55)'; c.fillRect(W / 2, by, 150, 12);
      const mx = W / 2 - clamp(this.shown, -1, 1) * 150;   // (you pull it toward your name)
      c.fillStyle = '#ffffff'; c.fillRect(mx - 2, by - 4, 4, 20);
      R.text('PIN', bx, by - 1, { size: 11, color: '#c0d0ff' }); R.text('PIN', bx + 300, by - 1, { size: 11, align: 'right', color: '#ffc0b0' });
      // the buttons, in turn
      R.window(W / 2 - 110, H - 70, 220, 60);
      ['ok', 'square'].forEach((b, i) => {
        const x = W / 2 - 60 + i * 50, on = b === this.next;
        c.save(); c.globalAlpha = on ? 1 : 0.4; ui.glyph(b, x, H - 48, on && this.pushT > 0 ? 28 : 24);
        R.text(MG.btn(b), x, H - 32, { size: 11, align: 'center', color: on ? '#ffffff' : '#9098b0', shadow: false }); c.restore();
        if (on) { c.strokeStyle = (this.t >> 3) % 2 ? '#ffe060' : '#b09030'; c.lineWidth = 2; c.strokeRect(x - 18, H - 66, 36, 48); }
      });
      R.text('Alternate!', W / 2 + 46, H - 54, { size: 13, color: this.miss ? '#ff8080' : '#c0c8e0' });
      if (this.surge && !this.surge.on && this.t % 16 < 10) ui.big('He’s gathering strength...', 120, '#ffb060', 20);
      if (this.surge && this.surge.on) ui.big('HNNNGH!', 110, '#ff6050', 34);
      ui.readyGo(this.t, 200);
      if (this.over) ui.big(this.won ? 'PINNED HIM!' : 'SLAM!', 180, this.won ? '#ffe060' : '#ff7070', 40);
    }
    resultTitle(r) { return r.won ? 'YOU WIN!' : 'YOU LOSE'; }
    resultRows(r) { return [['Opponent', this.foe.name], ['Time', r.time + ' s']]; }
  }
  MG.register('arm_wrestle', {
    title: 'Arm Wrestling',
    music: () => null,
    help: (o) => ({ title: 'ARM WRESTLING  -  ' + ((AW.foes[o.foe] || AW.foes.sumo).name.toUpperCase()),
      lines: [`Press ${MG.btn('ok')} and ${MG.btn('square')} one after the other, as fast as you can, to force his fist to the table. The same button twice slips.`,
        'When he gathers his strength, keep going: his surge lasts a second. 30 seconds: whoever is ahead then wins.'],
      controls: [[['ok', '/', 'square'], 'Push (alternate)']] }),
    create: (opts) => new ArmWrestle(opts),
  });

  // ================================================================== WONDER CATCHER
  // The case: x -0.95..0.95, z -0.7..0.7, the chute in the front-left corner. Move the claw (15 seconds), drop it with
  // ○. The grip depends on how well it's centred and how heavy the plush is; heavy ones can slip on the way up.
  const CT = { X: 0.95, Z: 0.7, TOP: 1.3, SPEED: 0.02, TIME: 60 * 15, CHUTE: [-0.76, 0.5] };
  const PLUSH = {
    moogle: { name: 'Moogle', r: 0.15, w: 1.0, n: 5, v: 1 },
    cactuar: { name: 'Cactuar', r: 0.13, w: 1.0, n: 3, v: 1 },
    chocobo: { name: 'Chocobo', r: 0.16, w: 1.25, n: 3, v: 2 },
    cait: { name: 'Cait Sith', r: 0.15, w: 1.35, n: 2, v: 3 },
    tonberry: { name: 'Tonberry', r: 0.14, w: 1.9, n: 1, v: 8 },
    gold: { name: 'Gold Chocobo', r: 0.17, w: 2.3, n: 1, v: 10 },
  };
  let plushMesh = null;
  function plushMeshes() {
    if (plushMesh) return plushMesh;
    const eyes = (mb, y, z, gap, r) => [-1, 1].forEach(k => mb.sphere(k * gap, y, z, r, r, r * 0.6, '#1a1a1a', 5, 3, true));
    const chocobo = (col, beak) => MG.mesh(mb => {
      mb.sphere(0, 0.1, 0, 0.12, 0.1, 0.13, col, 8, 6, true); mb.sphere(0, 0.22, 0.08, 0.07, 0.07, 0.07, col, 8, 6, true);
      mb.spike([0, 0.21, 0.14], [0, -0.2, 1], 0.07, 0.03, 4, beak); mb.spike([0, 0.28, 0.07], [0, 1, -0.4], 0.07, 0.03, 4, col);
      [-1, 1].forEach(k => mb.spike([k * 0.1, 0.12, 0], [k, 0.2, -0.4], 0.08, 0.04, 3, col)); eyes(mb, 0.24, 0.13, 0.035, 0.012);
    });
    plushMesh = {
      moogle: MG.mesh(mb => {
        mb.sphere(0, 0.09, 0, 0.1, 0.09, 0.09, '#f6f2ec', 8, 6, true); mb.sphere(0, 0.21, 0, 0.1, 0.09, 0.09, '#f6f2ec', 8, 6, true);
        mb.box(0, 0.33, 0, 0.012, 0.06, 0.012, '#3a3030'); mb.sphere(0, 0.37, 0, 0.035, 0.035, 0.035, '#e02030', 6, 4, true);
        mb.sphere(0, 0.19, 0.085, 0.025, 0.02, 0.02, '#f0a0a0', 5, 3, true); eyes(mb, 0.23, 0.08, 0.035, 0.01);
        [-1, 1].forEach(k => mb.spike([k * 0.07, 0.14, -0.06], [k, 0.5, -0.6], 0.08, 0.03, 3, '#9060c0'));
      }),
      cactuar: MG.mesh(mb => {
        mb.prism(0, 0, 0, 0.07, 0.07, 0.26, 8, '#5ab040', true); mb.sphere(0, 0.26, 0, 0.07, 0.05, 0.07, '#5ab040', 8, 4, true);
        mb.box(-0.1, 0.18, 0, 0.1, 0.04, 0.04, '#5ab040'); mb.box(-0.14, 0.22, 0, 0.04, 0.1, 0.04, '#5ab040'); mb.box(0.1, 0.1, 0, 0.1, 0.04, 0.04, '#5ab040'); mb.box(0.14, 0.05, 0, 0.04, 0.08, 0.04, '#5ab040');
        [[-0.025, 0.22], [0.025, 0.22], [0, 0.17]].forEach(([x, y]) => mb.sphere(x, y, 0.068, 0.014, 0.018, 0.01, '#1a2a10', 5, 3, true));
      }),
      chocobo: chocobo('#f0d030', '#f09020'),
      gold: chocobo('#e8b820', '#fff0a0'),
      cait: MG.mesh(mb => {
        mb.sphere(0, 0.1, 0, 0.1, 0.1, 0.09, '#1c1c20', 8, 6, true); mb.sphere(0, 0.22, 0, 0.09, 0.08, 0.08, '#1c1c20', 8, 6, true);
        mb.sphere(0, 0.2, 0.05, 0.06, 0.05, 0.04, '#f4f0e8', 7, 5, true); [-1, 1].forEach(k => mb.spike([k * 0.05, 0.28, 0], [k * 0.3, 1, 0], 0.06, 0.03, 3, '#1c1c20'));
        mb.prism(0, 0.29, 0, 0.05, 0.06, 0.04, 5, '#e0b020'); mb.box(0, 0.14, 0.085, 0.12, 0.03, 0.01, '#d02030'); eyes(mb, 0.23, 0.085, 0.03, 0.01);
      }),
      tonberry: MG.mesh(mb => {
        mb.prism(0, 0, 0, 0.11, 0.08, 0.18, 8, '#6a4a2a', true); mb.sphere(0, 0.21, 0, 0.08, 0.07, 0.08, '#6ab050', 8, 6, true);
        mb.prism(0, 0.2, 0, 0.09, 0.03, 0.12, 8, '#6a4a2a'); [-1, 1].forEach(k => mb.sphere(k * 0.03, 0.22, 0.07, 0.016, 0.016, 0.01, '#f0e060', 5, 3, true));
        mb.box(0.1, 0.16, 0.04, 0.012, 0.16, 0.012, '#4a3a2a'); mb.sphere(0.1, 0.07, 0.04, 0.03, 0.035, 0.03, '#ffd040', 6, 4, true);
        mb.box(-0.09, 0.1, 0.05, 0.015, 0.1, 0.01, '#c0c8d0');
      }),
    };
    return plushMesh;
  }

  class Catcher {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.claw = { x: 0.4, z: -0.1, y: CT.TOP, open: 0 };
      this.phase = 'move'; this.left = CT.TIME; this.pt = 0; this.carried = null; this.won = null;
      // the pile: rarer ones fewer; none in front of the chute
      const rnd = opts.seed != null ? MG.rng('catcher-' + opts.seed) : Math.random;
      this.prizes = [];
      for (const kind in PLUSH) for (let i = 0; i < PLUSH[kind].n; i++) {
        const d = PLUSH[kind];
        for (let tries = 0; tries < 60; tries++) {
          const back = d.w > 1.5;   // (the rare ones sit toward the back of the case)
          const x = -CT.X + d.r + rnd() * (2 * CT.X - 2 * d.r), z = -CT.Z + d.r + rnd() * ((back ? CT.Z - 0.1 : 2 * CT.Z - d.r) - d.r);
          if (Math.hypot(x - CT.CHUTE[0], z - CT.CHUTE[1]) < 0.36) continue;
          if (this.prizes.some(p => Math.hypot(p.x - x, p.z - z) < (p.r + d.r) * 0.9)) continue;
          this.prizes.push({ kind, x, z, y: 0, r: d.r, w: d.w, yaw: rnd() * 1.4 - 0.7 });
          break;
        }
      }
      this.env = MG.mesh(mb => {
        mb.floor(-1.1, -0.85, 1.1, 0.85, 0, '#c04a8a');                                              // felt
        mb.box(0, 0.8, -0.86, 2.2, 1.6, 0.02, '#3a2a50');                                            // the back
        [[-1.1, -0.85], [1.1, -0.85], [-1.1, 0.85], [1.1, 0.85]].forEach(([x, z]) => mb.box(x, 0.85, z, 0.05, 1.7, 0.05, '#e8c040'));
        mb.box(0, 1.72, 0, 2.3, 0.1, 1.8, { side: '#d04a90', top: '#a03070', front: '#d04a90' });
        [-1, 1].forEach(k => mb.box(k * 1.1, 0.03, 0, 0.04, 0.06, 1.7, '#e8c040'));
        mb.box(0, 0.03, 0.85, 2.2, 0.06, 0.04, '#e8c040');
        // the chute: a hole with a clear wall around it
        mb.prism(CT.CHUTE[0], 0.001, CT.CHUTE[1], 0.17, 0.17, 0.004, 12, '#0c0810');
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; mb.box(CT.CHUTE[0] + Math.cos(a) * 0.19, 0.05, CT.CHUTE[1] + Math.sin(a) * 0.19, 0.08, 0.1, 0.02, '#b8e4ff'); }   // (a clear rim)
        mb.box(CT.CHUTE[0], 0.1, CT.CHUTE[1], 0.34, 0.012, 0.012, '#e8c040');
        mb.box(0, 1.52, 0, 2.0, 0.03, 0.05, '#9098a0');                                              // the gantry
        mb.floor(-3, -3, 3, 3, -0.02, '#200c28');                                                      // (the cabinet's surroundings)
      });
      this.glow = MG.mesh(mb => { mb.box(0, 1.66, 0.9, 2.1, 0.03, 0.01, '#fff0a0'); mb.box(0, 1.66, -0.86, 2.1, 0.03, 0.01, '#ff80d0'); }, { unlit: true });
      // a finger of the claw, hinged at the hub's rim: down and out, then bending back in to a hooked tip. Built with
      // +z as outward; its pitch opens it (the bottom swings out) and closes it (the tips meet under the hub)
      this.finger = MG.mesh(mb => {
        const seg = (a, b, w, col) => {
          const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0], d[1], d[2]);
          mb.push(); mb.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); mb.rotate(Math.atan2(-d[2] / L, -d[1] / L), 0, 0);
          mb.box(0, 0, 0, w, L, w, col); mb.pop();
        };
        const A = [0, 0, 0], B = [0, -0.07, 0.036], C = [0, -0.14, 0.012], T = [0, -0.152, -0.022];
        seg(A, B, 0.02, '#c8ccd4'); seg(B, C, 0.018, '#c8ccd4'); seg(C, T, 0.016, '#e0e4e8');
        mb.sphere(B[0], B[1], B[2], 0.014, 0.014, 0.014, '#8a9098', 6, 4, true);
      });
      this.hub = MG.mesh(mb => {
        mb.prism(0, -0.035, 0, 0.052, 0.04, 0.07, 10, '#8a9098', true);              // the motor housing, tapering up
        mb.sphere(0, 0.035, 0, 0.04, 0.025, 0.04, '#6a7078', 10, 4, true);            // its rounded cap
        mb.prism(0, -0.045, 0, 0.022, 0.022, 0.012, 8, '#40464e', true);            // the plunger under it
        for (let i = 0; i < 3; i++) { const a = i * 2.094; mb.box(Math.sin(a) * 0.04, -0.035, Math.cos(a) * 0.04, 0.026, 0.016, 0.016, '#5a6068'); }   // hinges
      });
      this.cable = MG.mesh(mb => mb.box(0, -0.5, 0, 0.008, 1, 0.008, '#d0d4d8'));
      this.marker = MG.mesh(mb => { for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mb.box(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.07, 0.035, 0.006, 0.035, '#40ffff'); } }, { unlit: true });
      this.laser = MG.mesh(mb => mb.box(0, -0.5, 0, 0.006, 1, 0.006, '#40ffff'), { unlit: true });
    }
    begin() { }
    under(x, z) { return this.prizes.filter(p => !p.gone && p !== this.carried && Math.hypot(p.x - x, p.z - z) < p.r); }
    landY() { const c = this.claw; let y = 0.17; for (const p of this.under(c.x, c.z)) y = Math.max(y, p.y + p.r * 1.8 + 0.03); return y; }
    grip() {   // the plush the closing claw takes hold of (if any) and how well
      const c = this.claw, near = this.prizes.filter(p => !p.gone && !p.fall).map(p => ({ p, d: Math.hypot(p.x - c.x, p.z - c.z) })).filter(o => o.d < o.p.r + 0.07).sort((a, b) => a.d - b.d)[0];
      if (!near) return null;
      const centred = clamp(1 - near.d / (near.p.r + 0.07), 0, 1);
      return { p: near.p, centred, chance: clamp((0.1 + 0.9 * centred * centred) / Math.pow(near.p.w, 1.6), 0, 0.95) };
    }
    drop(p) { p.fall = true; p.vy = 0; p.x = this.claw.x + (Math.random() - 0.5) * 0.06; p.z = this.claw.z + (Math.random() - 0.5) * 0.06; this.carried = null; MG.sfx('cancel', 0.6); }
    update(I) {
      this.t++; this.pt++; this.fx.update();
      const c = this.claw;
      for (const p of this.prizes) if (p.fall) {
        p.vy -= 0.004; p.y += p.vy;
        const floor = p.chute ? -0.4 : 0;
        if (p.y <= floor) { p.y = floor; p.fall = false; if (p.chute) p.gone = true; }
      }
      const go = (ph) => { this.phase = ph; this.pt = 0; };
      switch (this.phase) {
        case 'move': {
          if (this.t < MG.READY) break;
          this.left--;
          const dx = (I.held('right') ? 1 : 0) - (I.held('left') ? 1 : 0), dz = (I.held('down') ? 1 : 0) - (I.held('up') ? 1 : 0);
          c.x = clamp(c.x + dx * CT.SPEED, -CT.X + 0.08, CT.X - 0.08); c.z = clamp(c.z + dz * CT.SPEED, -CT.Z + 0.08, CT.Z - 0.08);
          if (I.pressed('ok') || this.left <= 0) { MG.sfx('confirm'); go('drop'); }
          break;
        }
        case 'drop': c.open = Math.min(1, c.open + 0.06); c.y -= 0.018; { const ly = this.landY(); if (c.y <= ly) { c.y = ly; go('grab'); } } break;
        case 'grab':
          c.open = Math.max(0, c.open - 0.05);
          if (c.open <= 0) {
            const g = this.grip();
            this.hold = g;
            if (g && Math.random() < g.chance) { this.carried = g.p; g.p.ox = (g.p.x - c.x) * 0.4; g.p.oz = (g.p.z - c.z) * 0.4; MG.sfx('set', 0.6); }
            go('lift');
          }
          break;
        case 'lift':
          c.y += 0.013;
          if (this.carried && !this.slip1 && c.y > (CT.TOP + this.landY()) / 2) {   // a heavy one, badly held, can slip
            this.slip1 = true;
            const g = this.hold, chance = clamp((g.p.w - 1) * (0.15 + 0.3 * (1 - g.centred)) + 0.03, 0, 0.6);
            if (Math.random() < chance) this.drop(this.carried);
          }
          if (c.y >= CT.TOP) { c.y = CT.TOP; go(this.carried ? 'carry' : 'return'); }
          break;
        case 'carry': case 'return': {
          const tx = this.phase === 'carry' ? CT.CHUTE[0] : 0.4, tz = this.phase === 'carry' ? CT.CHUTE[1] : -0.1;
          const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
          if (d > 0.015) { c.x += dx / d * 0.015; c.z += dz / d * 0.015; }
          else if (this.phase === 'carry') go('release');
          else go('end');
          if (this.phase === 'carry' && this.carried && !this.slip2 && d < 0.5) {
            this.slip2 = true;
            if (Math.random() < clamp((this.hold.p.w - 1) * 0.12 * (1 - this.hold.centred), 0, 0.3)) this.drop(this.carried);
          }
          break;
        }
        case 'release':
          c.open = Math.min(1, c.open + 0.05);
          if (this.carried && c.open > 0.5) {
            const p = this.carried; this.carried = null; p.fall = true; p.chute = true; p.vy = 0; p.x = c.x; p.z = c.z; p.y = c.y - 0.2;
            this.won = p.kind; MG.sfx('found');
            this.fx.burst([CT.CHUTE[0], 0.3, CT.CHUTE[1]], 16, '#fff0a0', 0.03, 30, 0.05, 0.001);
          }
          if (c.open >= 1 && this.pt > 50) go('end');
          break;
        case 'end':
          if (this.pt > 50) { this.result = { won: !!this.won, prize: this.won, name: this.won ? PLUSH[this.won].name : null, score: this.won ? PLUSH[this.won].v : 0 }; this.done = true; }
          break;
      }
      if (this.carried) { const p = this.carried; p.x = c.x + (p.ox || 0); p.z = c.z + (p.oz || 0); p.y = c.y - 0.08 - p.r * 1.3; }
    }
    // (tests) aim for the best plush by value and grip, centre on it, drop
    bot() {
      if (this.phase !== 'move' || this.t < MG.READY) return [];
      if (!this.aim || this.aim.gone) this.aim = this.prizes.filter(p => !p.gone).sort((a, b) => PLUSH[b.kind].v / Math.sqrt(b.w) - PLUSH[a.kind].v / Math.sqrt(a.w))[this.opts.botPick || 0];
      const p = this.aim, c = this.claw, out = [];
      if (p.x - c.x > 0.012) out.push('right'); else if (p.x - c.x < -0.012) out.push('left');
      if (p.z - c.z > 0.012) out.push('down'); else if (p.z - c.z < -0.012) out.push('up');
      return out.length ? out : ['ok'];
    }
    render() {
      MG.sky('#1a0a20', '#0a0410');
      this.cam.set([0, 2.05, 2.55], [0, 0.35, -0.05], 42, 0.1, 40);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.2, -0.9, -0.35], color: [0.9, 0.85, 0.85], ambient: [0.5, 0.45, 0.52] } });
      this.cam.apply();
      GL.draw(this.env, null); GL.draw(this.glow, null);
      const M = plushMeshes(), c = this.claw;
      for (const p of this.prizes) {
        if (p.gone) continue;
        if (!p.chute) MG.shadow(p.x, 0.002, p.z, p.r * 0.9, 0.25);
        MG.put(M[p.kind], [p.x, p.y, p.z], [0, p.yaw, 0], p.r / 0.15);
      }
      // the claw: cable, housing, three fingers hinged at its rim (open: swung out; shut: the hooks meet underneath)
      MG.put(this.cable, [c.x, 1.52, c.z], null, [1, 1.52 - c.y, 1]);
      MG.put(this.hub, [c.x, c.y, c.z]);
      for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; MG.put(this.finger, [c.x + Math.sin(a) * 0.042, c.y - 0.04, c.z + Math.cos(a) * 0.042], [0.14 - c.open * 0.8, a, 0], 1); }
      if (this.phase === 'move') {   // where it will land: a ring on top of whatever is under the claw, a guide line down to it
        const top = Math.max(0.006, this.landY() - 0.02);
        MG.put(this.marker, [c.x, top, c.z], null, 1, { blend: 'add', tint: [0.3, 1, 1, 0.9] });
        MG.put(this.laser, [c.x, c.y - 0.19, c.z], null, [1, Math.max(0.01, c.y - 0.19 - top), 1], { blend: 'add', tint: [0.3, 1, 1, 0.35] });
      }
      this.fx.draw();
      GL.end();
      R.window(8, 8, 170, 40);
      R.text(this.phase === 'move' ? `TIME ${Math.ceil(Math.max(0, this.left) / 60)}` : this.won ? 'GOT ONE!' : '...', 93, 16, { size: 18, align: 'center', weight: '700', color: this.won ? '#ffe060' : '#ffffff' });
      if (this.phase === 'move' && this.t >= MG.READY) {
        R.window(10, H - 60, 330, 50);
        R.text('Move the claw', 24, H - 52, { size: 13, color: R.COL.cyan }); ui.keys(['up', 'down', 'left', 'right'], 24, H - 24, 14);
        R.text('Drop', 222 + ui.keys(['ok'], 196, H - 36, 16), H - 46, { size: 14 });
      }
      ui.readyGo(this.t, 200);
    }
    resultTitle(r) { return r.won ? `${r.name.toUpperCase()}!` : 'SO CLOSE...'; }
    resultRows(r) { return [['Prize', r.won ? r.name + ' plush' : 'Nothing this time']]; }
  }
  MG.register('catcher', {
    title: 'Wonder Catcher',
    music: () => null,
    help: () => ({ title: 'WONDER CATCHER',
      lines: ['Steer the claw over a plush and drop it. The better you centre it, the better the grip; the heavy ones (Tonberry, Gold Chocobo) slip unless you’re dead on.',
        'The glowing ring shows where the claw will land. 15 seconds.'],
      controls: [[['up', 'down', 'left', 'right'], 'Move the claw'], [['ok'], 'Drop it']] }),
    create: (opts) => new Catcher(opts),
  });

  // ================================================================== 3-D BATTLER
  // Heights: 2 high, 1 middle, 0 low (a kick). ○ attacks at the height held (↑ high, ↓ low, neither middle); hold ✕
  // to guard at that height. Every attack shows its height as it winds up; a guard at the right height stops it and
  // leaves the attacker open. Five fighters, one round each; losing ends the run.
  const BT_FOES = [
    { name: 'Girl in Pink', app: { base: 'woman', top: '#f080b0', sleeve: '#f080b0', bottom: '#f0a0c8', hair: '#6a3a20', hairStyle: 'ponytail', skirt: 'short' }, wind: 36, rate: 0.012, guard: 0.12, dmg: 8, hp: 70, punish: 0 },
    { name: 'Fat Wrestler', app: { base: 'man', build: 'fat', top: '#e8b088', sleeve: 'skin', bottom: '#2a6a2a', hairStyle: 'bald', skin: '#e8b088' }, wind: 30, rate: 0.014, guard: 0.25, dmg: 14, hp: 100, punish: 0.4 },
    { name: 'Afro Discoman', app: { base: 'man', build: 'slim', top: '#f0d020', sleeve: '#f0d020', bottom: '#e8e8f0', hair: '#1a1010', hairStyle: 'messy' }, afro: true, wind: 23, rate: 0.022, guard: 0.45, dmg: 13, hp: 130, combo: 0.5, punish: 0.7 },
    { name: 'Red Spaceman', app: { base: 'man', top: '#d02020', sleeve: '#d02020', bottom: '#d02020', hairStyle: 'helmet', hair: '#e8e8f0' }, wind: 20, rate: 0.025, guard: 0.55, dmg: 16, hp: 160, feint: 0.3, punish: 0.85 },
    { name: 'Invisible One', app: { base: 'man', top: '#8a9aaa', sleeve: '#8a9aaa', bottom: '#8a9aaa', hairStyle: 'none' }, wind: 17, rate: 0.027, guard: 0.65, dmg: 19, hp: 190, invisible: true, punish: 1 },
  ];
  const BT_GP = [0, 0, 3, 30, 100, 300];     // by fighters beaten
  const BT_PLAYER = { base: 'man', top: '#2a5ac8', sleeve: 'skin', bottom: '#f0f0f8', hair: '#e0b020', hairStyle: 'spiky' };
  const BT = { WIND: 10, STRIKE: 5, REC: 16, FREC: 22, STUN: 18, TIME: 60 * 45, HP: 100 };
  // poses: bone -> [x, y, z] rotations (the rest of the body keeps the guard stance)
  const BP = {
    idle: { torso: [0.1, 0, 0], armL: [-0.7, 0, 0.2], foreL: [-1.9, 0, 0], armR: [-0.5, 0, -0.2], foreR: [-2.0, 0, 0], thighL: [-0.25, 0, 0], thighR: [0.2, 0, 0], shinL: [0.3, 0, 0] },
    wind2: { armR: [-0.2, 0, -0.5], foreR: [-2.3, 0, 0], torso: [-0.1, 0.45, 0] },
    strike2: { armR: [-2.25, 0, 0], foreR: [-0.1, 0, 0], torso: [0.15, -0.35, 0] },
    wind1: { armR: [-0.3, 0, -0.4], foreR: [-2.2, 0, 0], torso: [0, 0.4, 0] },
    strike1: { armR: [-1.55, 0, 0], foreR: [-0.05, 0, 0], torso: [0.25, -0.35, 0] },
    wind0: { thighR: [0.45, 0, 0], shinR: [1.3, 0, 0], torso: [-0.05, 0, 0] },
    strike0: { thighR: [-1.35, 0, 0], shinR: [0.1, 0, 0], torso: [-0.3, 0, 0] },
    guard2: { armL: [-2.5, 0, 0.35], foreL: [-1.9, 0, 0], armR: [-2.5, 0, -0.35], foreR: [-1.9, 0, 0] },
    guard1: { armL: [-1.3, 0, 0.55], foreL: [-2.2, 0, 0], armR: [-1.3, 0, -0.55], foreR: [-2.2, 0, 0] },
    guard0: { armL: [-0.5, 0, 0.2], foreL: [-0.9, 0, 0], armR: [-0.5, 0, -0.2], foreR: [-0.9, 0, 0], torso: [0.45, 0, 0], thighL: [-0.8, 0, 0], thighR: [-0.8, 0, 0], shinL: [1.3, 0, 0], shinR: [1.3, 0, 0] },
    hit: { torso: [-0.45, 0, 0], head: [-0.35, 0, 0], armL: [-0.3, 0, 0.3], armR: [-0.3, 0, -0.3], foreL: [-1.2, 0, 0], foreR: [-1.2, 0, 0] },
  };
  const BONES = ['torso', 'head', 'armL', 'foreL', 'armR', 'foreR', 'thighL', 'shinL', 'thighR', 'shinR'];
  const HNAME = ['LOW', 'MID', 'HIGH'], HCOL = ['#60ff90', '#ffe060', '#ff7060'];
  function poseOf(f) {
    const k = f.act === 'wind' ? 'wind' + f.h : f.act === 'strike' ? 'strike' + f.h : f.act === 'guard' ? 'guard' + f.h : f.act === 'hit' || f.act === 'ko' ? 'hit' : 'idle';
    return Object.assign({}, BP.idle, BP[k] || {});
  }
  class Fighter {
    constructor(app, x, dir, hp) {
      this.m = MG.char(app); this.m.scale = 1.6; this.x = x; this.dir = dir; this.hp = hp; this.max = hp;
      this.act = 'idle'; this.t = 0; this.h = 1; this.push = 0; this.flash = 0; this.fall = 0;
      this.cur = {}; BONES.forEach(b => { this.cur[b] = [0, 0, 0]; });
    }
    set(act, h) { this.act = act; this.t = 0; if (h != null) this.h = h; }
    pose() {
      const want = poseOf(this), k = this.act === 'strike' ? 0.6 : 0.35;
      BONES.forEach(b => { const w = want[b] || [0, 0, 0], c = this.cur[b]; for (let i = 0; i < 3; i++) c[i] = lerp(c[i], w[i], k); });
      // (the fighter on the right is mirrored - left and right limbs swapped - so both strike with the arm and leg
      // on the camera's side, where the wind-up can be seen)
      const mir = this.dir < 0, swap = (b) => !mir ? b : b.endsWith('L') ? b.slice(0, -1) + 'R' : b.endsWith('R') ? b.slice(0, -1) + 'L' : b;
      this.m.onPose = (m) => {
        BONES.forEach(b => { const bb = m.b(swap(b)); if (bb) { const c = this.cur[b]; bb.rot[0] = c[0]; bb.rot[1] = mir ? -c[1] : c[1]; bb.rot[2] = mir ? -c[2] : c[2]; } });
        m.b('hips').pos[1] = this.act === 'guard' && this.h === 0 ? -0.1 : 0;
      };
      this.m.update();
    }
  }
  class Battler {
    constructor(opts) {
      this.opts = opts; this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.stage = 0; this.beaten = 0; this.phase = 'intro'; this.pt = 0;
      this.env = MG.mesh(mb => {
        mb.floor(-4, -2, 4, 2, 0, '#141828');
        for (let i = -4; i <= 4; i += 0.5) mb.floor(i - 0.008, -2, i + 0.008, 2, 0.002, '#2a4a8a');
        for (let z = -2; z <= 2; z += 0.5) mb.floor(-4, z - 0.008, 4, z + 0.008, 0.002, '#2a4a8a');
        mb.box(0, 2, -2.2, 8, 4, 0.2, '#0c0c1c');
        [-2.6, 2.6].forEach(x => mb.box(x, 1.2, -1.6, 0.3, 2.4, 0.3, '#1c2038'));
      });
      this.glow = MG.mesh(mb => {
        FF7.field.text3d(mb, '3-D BATTLER', { pos: [0, 1.95, -2.08], size: 0.22, col: '#a08a30', w: 0.2, italic: true });
        mb.box(0, 1.72, -2.08, 5.5, 0.04, 0.02, '#ff40c0'); [-2.6, 2.6].forEach(x => mb.box(x, 2.3, -1.44, 0.34, 0.04, 0.02, '#40e0ff'));
      }, { unlit: true });
      this.afro = MG.mesh(mb => mb.sphere(0, 0, 0, 0.14, 0.12, 0.14, '#1a1010', 8, 6, true));
      this.me = new Fighter(BT_PLAYER, -0.55, 1, BT.HP);
      this.newRound();
    }
    newRound() {
      const d = BT_FOES[this.stage];
      this.foeDef = d; this.foe = new Fighter(d.app, 0.55, -1, d.hp);
      this.me.hp = BT.HP; this.me.set('idle'); this.me.fall = 0;
      this.time = 0; this.phase = 'intro'; this.pt = 0;
    }
    begin() { }
    // one attack lands (or doesn't) the moment it strikes
    resolve(att, def, dmg) {
      if (def.act === 'guard' && def.h === att.h) {
        def.push = 0.08; att.t = -8;   // (blocked: the attacker is left open a little longer)
        if (def === this.foe && Math.random() < (this.foeDef.punish || 0)) this.foePunish = true;   // (and the fighter may punish it)
        MG.sfx('ching', 0.5); this.fx.burst(this.hitPos(def, att.h), 10, '#80c0ff', 0.03, 16, 0.05, 0);
        return;
      }
      const counter = def.act === 'wind';
      const n = Math.round(dmg * (counter ? 1.5 : 1));
      def.hp = Math.max(0, def.hp - n); def.set('hit'); def.push = 0.14; def.flash = 8;
      MG.sfx(counter ? 'crit' : 'hit', 0.8); this.fx.burst(this.hitPos(def, att.h), counter ? 18 : 12, counter ? '#ffe060' : '#ffffff', 0.04, 18, 0.06, 0);
      if (counter) this.msg = { text: 'COUNTER!', t: 50 };
      if (def.hp <= 0) { def.set('ko'); this.phase = 'ko'; this.pt = 0; this.koWin = def === this.foe; MG.sfx('bosskill', 0.6); }
    }
    hitPos(f, h) { return [f.x + f.push * -f.dir, [0.35, 0.95, 1.25][h], 0.1]; }
    stepFighter(f, other, dmg, rec) {
      f.t++; if (f.push > 0) f.push = Math.max(0, f.push - 0.01); if (f.flash > 0) f.flash--;
      if (f.act === 'wind' && f.t >= f.wind) { f.set('strike'); this.resolve(f, other, dmg); }
      else if (f.act === 'strike' && f.t >= BT.STRIKE) f.set('recover');
      else if (f.act === 'recover' && f.t >= rec) f.set('idle');
      else if (f.act === 'hit' && f.t >= BT.STUN) f.set('idle');
    }
    update(I) {
      this.t++; this.pt++; this.fx.update();
      if (this.msg && --this.msg.t <= 0) this.msg = null;
      const me = this.me, foe = this.foe, d = this.foeDef;
      if (this.phase === 'intro') { if (this.pt > 110) { this.phase = 'fight'; this.pt = 0; } return; }
      if (this.phase === 'ko' || this.phase === 'timeup') {
        if (this.phase === 'ko') { const f = this.koWin ? foe : me; f.fall = Math.min(1, f.fall + 0.04); }
        if (this.pt > 130) {
          if (this.koWin) {
            this.beaten++;
            if (this.stage + 1 < BT_FOES.length) { this.stage++; this.newRound(); return; }
          }
          this.result = { won: this.beaten === BT_FOES.length, beaten: this.beaten, gp: BT_GP[this.beaten], score: this.beaten };
          this.done = true;
        }
        return;
      }
      this.time++;
      // you
      const h = I.held('up') ? 2 : I.held('down') ? 0 : 1;
      if (me.act === 'idle' || me.act === 'guard') {
        if (I.pressed('ok')) { me.set('wind', h); me.wind = BT.WIND; this.foeReacts(); }
        else if (I.held('cancel')) { if (me.act !== 'guard' || me.h !== h) me.set('guard', h); }
        else if (me.act === 'guard') me.set('idle');
      }
      this.stepFighter(me, foe, 10, BT.REC);
      if (this.phase !== 'fight') return;
      // the fighter: attacks at its own pace (some in pairs), guards some of yours, some feint the height
      if (foe.act === 'guard' && foe.t > foe.guardFor) foe.set('idle');
      if (foe.act === 'guard' && this.foePunish && me.act !== 'strike') foe.set('idle');
      if (foe.act === 'idle' && (this.foePunish || Math.random() < d.rate * (this.comboNext ? 8 : 1))) {
        foe.set('wind', [0, 1, 1, 2, 2][U.rand(5)]); foe.wind = this.foePunish ? Math.round(d.wind * 0.6) : d.wind; foe.feinted = false;
        this.comboNext = false; this.foePunish = false;
      }
      if (foe.act === 'wind' && d.feint && !foe.feinted && foe.t === foe.wind - 12 && Math.random() < d.feint) { foe.feinted = true; foe.h = (foe.h + 1 + U.rand(2)) % 3; }
      if (foe.act === 'recover' && foe.t === 1 && d.combo && Math.random() < d.combo) this.comboNext = true;
      this.stepFighter(foe, me, d.dmg, BT.FREC);
      if (this.phase === 'fight' && this.time >= BT.TIME) {
        this.phase = 'timeup'; this.pt = 0; this.koWin = me.hp / me.max > foe.hp / foe.max;
        (this.koWin ? foe : me).set('ko'); MG.sfx('beep');
      }
    }
    foeReacts() {
      const d = this.foeDef, foe = this.foe;
      if ((foe.act === 'idle' || foe.act === 'guard') && Math.random() < d.guard) {
        const right = Math.random() < 0.55 + this.stage * 0.07;
        foe.set('guard', right ? this.me.h : (this.me.h + 1 + U.rand(2)) % 3); foe.guardFor = BT.WIND + BT.STRIKE + 10;
      }
    }
    // (tests) guard what's coming at its height, hit back while it recovers
    bot() {
      if (this.phase !== 'fight') return [];
      const f = this.foe, me = this.me, skill = this.opts.botSkill == null ? 1 : this.opts.botSkill;
      if (f.act === 'wind' && f.t === 1) f.botReads = Math.random() < skill;   // (reads this attack or not: once per attack)
      if (f.act === 'wind' && f.t >= f.wind - 11 && f.botReads) return [f.h === 2 ? 'up' : f.h === 0 ? 'down' : null, 'cancel'].filter(Boolean);
      if (me.act === 'guard' && f.act === 'wind' && f.botReads) return [f.h === 2 ? 'up' : f.h === 0 ? 'down' : null, 'cancel'].filter(Boolean);
      if ((me.act === 'idle' || me.act === 'guard') && (f.act === 'recover' || f.act === 'hit' || (f.act === 'idle' && this.t % 40 === 0))) return this.t % 2 ? ['ok'] : [];
      return [];
    }
    render() {
      MG.sky('#0a0c1c', '#1c1030');
      this.cam.set([0, 1.25, 3.3], [0, 0.85, 0], 40, 0.1, 60);
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.5], color: [0.85, 0.82, 0.8], ambient: [0.42, 0.42, 0.5] } });
      this.cam.apply();
      GL.draw(this.env, null); GL.draw(this.glow, null);
      const inv = this.foeDef.invisible;
      [this.me, this.foe].forEach(f => {
        f.pose();
        const x = f.x - f.push * f.dir, a = f === this.foe && inv ? (f.act === 'strike' || f.flash ? 0.8 : f.act === 'wind' ? 0.35 : 0.1) : 1;
        MG.shadow(x, 0, 0, 0.32, 0.35 * a);
        const opt = f.flash ? { add: [0.6, 0.6, 0.6] } : a < 1 ? { blend: 'alpha', tint: [1, 1, 1, a] } : null;
        MG.drawModel(f.m, [x, 0, 0], f.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0, -f.fall * 1.4 * f.dir, opt);
        if (f === this.foe && this.foeDef.afro) { f.m.computeWorld && f.m.computeWorld(); const hp = f.m.worldPoint('head', [0, 0.12, 0]); MG.put(this.afro, hp, null, 1, opt); }
      });
      this.fx.draw();
      GL.end();
      // health, the round, the clock
      const bar = (f, x, name, right) => {
        R.window(x, 8, 250, 46);
        R.text(name, right ? x + 238 : x + 12, 14, { size: 13, align: right ? 'right' : 'left', color: right ? '#ff9080' : '#80b0ff' });
        R.bar(x + 12, 36, 226, 8, f.hp / f.max, right ? '#e04040' : '#3070e0', right ? '#ffa060' : '#80e0ff');
      };
      bar(this.me, 8, 'YOU', false); bar(this.foe, W - 258, this.foeDef.name.toUpperCase(), true);
      R.text(String(Math.ceil(Math.max(0, BT.TIME - this.time) / 60)), W / 2, 14, { size: 22, align: 'center', weight: '700' });
      R.text(`${this.stage + 1} / ${BT_FOES.length}`, W / 2, 40, { size: 12, align: 'center', color: R.COL.gray });
      // the tell: the height of an attack winding up (the Invisible One's shows late)
      const tell = (f, show) => {
        if (f.act !== 'wind' || !show) return;
        const q = this.cam.project([f.x, 1.72, 0]); if (!q.visible) return;
        const t = HNAME[f.h] + '!', w = R.measure(t, 20, '700') + 22;
        R.ctx.fillStyle = 'rgba(0,0,10,0.75)'; R.ctx.fillRect(q.x - w / 2, q.y - 3, w, 28);
        R.text(t, q.x, q.y, { size: 20, align: 'center', color: HCOL[f.h], weight: '700' });
      };
      tell(this.foe, !inv || this.foe.t >= this.foe.wind - 12);
      tell(this.me, true);
      if (this.phase === 'fight') {
        // (one after another: each hint where the last one ended)
        R.window(10, H - 58, 470, 48);
        let x = 22;
        [[['ok'], 'Attack'], [['cancel'], 'Guard (hold)'], [['up', '/', 'down'], 'High / low']].forEach(([k, t]) => {
          x += ui.keys(k, x, H - 34, 16) + 4; R.text(t, x, H - 43, { size: 13 }); x += R.measure(t, 13) + 18;
        });
      }
      if (this.phase === 'intro') { ui.big(`ROUND ${this.stage + 1}`, 150, '#ffffff', 30); if (this.pt > 50) ui.big(this.foeDef.name.toUpperCase(), 195, '#ffe060', 26); if (this.pt > 90) ui.big('FIGHT!', 240, '#ff7050', 36); }
      if (this.phase === 'ko') ui.big(this.koWin ? 'K.O.!' : 'YOU’RE DOWN!', 170, this.koWin ? '#ffe060' : '#ff7070', 44);
      if (this.phase === 'timeup') ui.big('TIME!', 170, '#ffe060', 44);
      if (this.msg) ui.big(this.msg.text, 120, '#ffe060', 24, Math.min(1, this.msg.t / 15));
    }
    resultTitle(r) { return r.won ? 'CHAMPION!' : r.beaten ? `${r.beaten} DOWN` : 'KNOCKED OUT'; }
    resultRows(r) { return [['Fighters beaten', `${r.beaten} / ${BT_FOES.length}`], ['GP', r.gp, '#ffe060']]; }
  }
  MG.register('battler', {
    title: '3-D Battler',
    music: () => null,
    help: () => ({ title: '3-D BATTLER',
      lines: ['Five fighters, one round each. Every attack shows its height (HIGH, MID or LOW) as it winds up: guard at that height and it bounces off, leaving them open.',
        'Hit them while they recover. An attack that lands while they wind up is a counter: half as much again. Lose once and the run ends.'],
      controls: [[['ok'], 'Attack at the height held'], [['cancel'], 'Guard (hold)'], [['up', '/', 'down'], 'High / low (neither: middle)']] }),
    create: (opts) => new Battler(opts),
  });
})();
