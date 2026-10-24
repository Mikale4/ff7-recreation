// Submarine battle: chase and sink the red Shinra submarine carrying the Huge Materia before time runs
// out (story), or the Wonder Square "Torpedo Attack" arcade (opts.mode === 'arcade', opts.level 0-4:
// destroy every enemy sub).
//   Left/Right turn, Up = dive / Down = rise (FF7), △ speed up, ✕ slow down, □ torpedo (homes on a
//   locked target), hold R1 sonar map, R2 change view.
//   Story result { won, score, time (s left), hp, kills }   Arcade result { won, score, level, kills, time, hp }
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, V3 = FF7.V3, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const ARENA = 300, SPEEDS = [0, 0.16, 0.28, 0.4];
  const floorY = (x, z) => { const e = Math.max(Math.abs(x), Math.abs(z)) / ARENA; return -52 + 9 * Math.sin(x / 47) * Math.cos(z / 61) + 5 * Math.sin((x + z) / 29) + (e > 0.85 ? (e - 0.85) * 220 : 0); };
  // Torpedo Attack levels (Gold Saucer FAQ): targets per level
  const LEVELS = [
    { name: 'Undersea Reactor Battle', targets: 7, reds: 1, hp: 2, mines: 8 },
    { name: 'Level 1', targets: 10, reds: 2, hp: 2, mines: 10 },
    { name: 'Level 2', targets: 8, reds: 2, hp: 3, mines: 14 },
    { name: 'Level 3', targets: 12, reds: 3, hp: 3, mines: 16 },
    { name: 'Level 4', targets: 10, reds: 3, hp: 4, mines: 22 },
  ];

  let MESH = null;
  function meshes() {
    if (MESH) return MESH;
    MESH = {};
    MESH.floor = MG.mesh(mb => {
      const N = 36, S = ARENA * 2 / N;
      const col = (x, z) => { const y = floorY(x, z); const k = U.clamp((y + 60) / 30, 0, 1); return U.mix('#3a4a38', '#8a8468', k); };
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const x0 = -ARENA + i * S, z0 = -ARENA + j * S, x1 = x0 + S, z1 = z0 + S;
        const P = (x, z) => [x, floorY(x, z), z];
        mb.quad(P(x0, z1), P(x1, z1), P(x1, z0), P(x0, z0), col(x0 + S / 2, z0 + S / 2));
      }
      const rnd = MG.rng('seabed');
      for (let i = 0; i < 90; i++) {
        const x = (rnd() - 0.5) * ARENA * 1.8, z = (rnd() - 0.5) * ARENA * 1.8, y = floorY(x, z);
        if (rnd() < 0.5) mb.sphere(x, y, z, 3 + rnd() * 7, 2 + rnd() * 6, 3 + rnd() * 7, U.mix('#4a4a50', '#6a6458', rnd()), 6, 4, false);
        else for (let k = 0; k < 4; k++) { const h = 6 + rnd() * 14; mb.push(); mb.translate(x + (rnd() - 0.5) * 3, y, z + (rnd() - 0.5) * 3); mb.rotate(rnd() * 0.3, rnd() * 6, rnd() * 0.3); mb.box(0, h / 2, 0, 0.5, h, 0.12, '#3a7a40'); mb.pop(); }
      }
      // the undersea reactor pipes on one side
      for (let i = 0; i < 5; i++) { mb.push(); mb.translate(-150 + i * 22, floorY(-150 + i * 22, 180) + 4, 180); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -40, 0, 3, 3, 80, 8, '#5a6070', true); mb.pop(); }
    });
    MESH.surface = MG.mesh(mb => { mb.floor(-ARENA * 1.5, -ARENA * 1.5, ARENA * 1.5, ARENA * 1.5, 0, '#a0d8f0'); }, { unlit: true, cull: false, blend: 'alpha' });
    MESH.mine = MG.mesh(mb => { mb.sphere(0, 0, 0, 1.2, 1.2, 1.2, '#303038', 8, 6, true); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mb.spike([Math.cos(a) * 1.1, (i % 2 ? 0.5 : -0.5), Math.sin(a) * 1.1], [Math.cos(a), i % 2 ? 0.5 : -0.5, Math.sin(a)], 0.6, 0.15, 4, '#707078'); } mb.spike([0, 1.1, 0], [0, 1, 0], 0.6, 0.15, 4, '#707078'); });
    MESH.chain = MG.mesh(mb => mb.box(0, -0.5, 0, 0.1, 1, 0.1, '#505058'));
    MESH.torpedo = MG.mesh(mb => { mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.loft([{ y: -1.2, rx: 0.05, rz: 0.05 }, { y: -1.0, rx: 0.2, rz: 0.2 }, { y: 1.0, rx: 0.2, rz: 0.2 }, { y: 1.3, rx: 0.02, rz: 0.02 }], { sides: 8, color: '#b0b4bc' }); mb.pop(); });
    MESH.bubble = MG.mesh(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#d0f0ff', 6, 4, true), { unlit: true, blend: 'alpha' });
    MESH.glow = MG.mesh(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#ffd070', 8, 5, true), { unlit: true, blend: 'add' });
    return MESH;
  }
  const sub = (id, color) => MG.fit(MG.vehicle(id, () => MG.fb.submarine({ color })), 9, 'length');

  class SubGame {
    constructor(opts, scene) {
      this.opts = opts; this.scene = scene;
      this.arcade = opts.mode === 'arcade';
      this.level = LEVELS[U.clamp(opts.level | 0, 0, 4)];
      this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      this.limit = 60 * (opts.time || (this.arcade ? 300 : 240));
      this.time = 0;
      this.view = 0;
      const rnd = MG.rng(this.arcade ? 'torpedo-' + (opts.level | 0) : 'huge-materia-chase');
      this.me = { p: [0, -22, -150], yaw: 0, vy: 0, thr: 2, v: 0.28, hp: 100, cd: 0, hurt: 0, bank: 0 };
      this.models = { me: sub('submarine_gray', '#8a9098'), red: sub('submarine_red', '#c02820'), yellow: sub('submarine_yellow', '#d8b020') };
      // enemies
      this.subs = [];
      const n = this.arcade ? this.level.targets : 7;
      const reds = this.arcade ? this.level.reds : 1;
      for (let i = 0; i < n; i++) {
        const red = i < reds;
        const a = rnd() * Math.PI * 2, r = red && !this.arcade ? 60 : 80 + rnd() * 160;
        const p = [Math.sin(a) * r * (red && !this.arcade ? 0 : 1), -15 - rnd() * 22, (red && !this.arcade ? -40 : Math.cos(a) * r)];
        this.subs.push({ red, p, yaw: red && !this.arcade ? 0 : rnd() * 6, v: red ? 0.24 : 0.2, hp: red ? (this.arcade ? this.level.hp + 1 : 10) : (this.arcade ? this.level.hp : 2), maxHp: 0, cd: 120 + U.rand(200), wp: null, alive: true, sink: 0, flash: 0, id: i });
      }
      this.subs.forEach(s => { s.maxHp = s.hp; });
      // red sub route (story): a loop around the arena
      this.route = [[0, -20, 60], [150, -30, 160], [220, -18, -60], [80, -35, -210], [-160, -24, -170], [-220, -32, 60], [-90, -20, 200]];
      this.mines = [];
      const nm = this.arcade ? this.level.mines : 14;
      for (let i = 0; i < nm; i++) { const x = (rnd() - 0.5) * ARENA * 1.6, z = (rnd() - 0.5) * ARENA * 1.6; if (Math.hypot(x - this.me.p[0], z - this.me.p[2]) < 40) continue; const fy = floorY(x, z); this.mines.push({ p: [x, fy + 12 + rnd() * 18, z], fy, alive: true }); }
      this.torps = [];
      this.kills = 0; this.lock = null; this.sonar = false; this.msg = null;
      this.ending = 0;
    }
    get go() { return this.t >= MG.READY; }
    fwd(yaw) { return [Math.sin(yaw), 0, Math.cos(yaw)]; }
    update(I) {
      this.t++;
      this.fx.update();
      if (this.msg && --this.msg.t <= 0) this.msg = null;
      const me = this.me, go = this.go && !this.ending;
      if (go) this.time++;
      // ---- player controls
      if (go) {
        const d = I.dir();
        me.yaw -= d.x * 0.02;
        me.bank = U.lerp(me.bank, d.x * 0.35, 0.1);
        me.vy += (d.y < 0 ? -0.012 : d.y > 0 ? 0.012 : 0);           // up = dive, down = rise
        if (I.pressed('menu')) { me.thr = Math.min(3, me.thr + 1); MG.sfx('cursor', 0.5); }
        if (I.pressed('cancel')) { me.thr = Math.max(0, me.thr - 1); MG.sfx('cursor', 0.5); }
        if (I.pressed('r2')) this.view = 1 - this.view;
        this.sonar = I.held('r1');
        if (me.cd > 0) me.cd--;
        if (I.pressed('square') && me.cd <= 0) this.fire(me, true);
      }
      me.vy *= 0.92;
      me.v = U.lerp(me.v, SPEEDS[me.thr], 0.03);
      const f = this.fwd(me.yaw);
      me.p[0] += f[0] * me.v; me.p[2] += f[2] * me.v; me.p[1] += me.vy;
      this.bound(me.p);
      if (me.hurt > 0) me.hurt--;
      // lock-on: nearest target within a forward cone
      this.lock = null; let best = 1e9;
      for (const s of this.subs) {
        if (!s.alive) continue;
        const d = V3.sub(s.p, me.p), dist = V3.len(d);
        if (dist > 110) continue;
        const cosA = (d[0] * f[0] + d[2] * f[2]) / Math.max(0.01, Math.hypot(d[0], d[2]));
        if (cosA > 0.92 && Math.abs(d[1]) < dist * 0.5 && dist < best) { best = dist; this.lock = s; }
      }
      // ---- enemies
      for (const s of this.subs) this.updateSub(s, go);
      // ---- torpedoes
      for (const tp of this.torps) this.updateTorp(tp);
      this.torps = this.torps.filter(tp => tp.life > 0);
      // ---- mines
      for (const m of this.mines) {
        if (!m.alive) continue;
        if (V3.dist(m.p, me.p) < 5) { m.alive = false; this.boom(m.p, 1.4); this.damage(20); }
        for (const s of this.subs) if (s.alive && V3.dist(m.p, s.p) < 4.5) { m.alive = false; this.boom(m.p, 1.4); }
      }
      // bubbles
      if (this.t % 4 === 0 && me.v > 0.05) this.fx.add(V3.add(me.p, V3.scale(f, -5)), [(Math.random() - 0.5) * 0.02, 0.05, (Math.random() - 0.5) * 0.02], 50, '#d0f0ff', 0.25, -0.0005, 'alpha');
      // ---- end
      if (!this.ending) {
        const redAlive = this.subs.some(s => s.red && s.alive);
        const anyAlive = this.subs.some(s => s.alive);
        if (me.hp <= 0) this.finish(false, 'HULL DESTROYED...');
        else if (!this.arcade && !redAlive) this.finish(true, 'The red submarine is sinking!');
        else if (this.arcade && !anyAlive) this.finish(true, 'ALL TARGETS DESTROYED!');
        else if (this.time >= this.limit) this.finish(false, 'TIME UP...');
      } else if (++this.ending > 150) this.complete();
    }
    bound(p) {
      p[0] = U.clamp(p[0], -ARENA * 0.92, ARENA * 0.92); p[2] = U.clamp(p[2], -ARENA * 0.92, ARENA * 0.92);
      const fy = floorY(p[0], p[2]) + 4;
      if (p[1] < fy) p[1] = fy;
      if (p[1] > -4) p[1] = -4;
    }
    updateSub(s, go) {
      if (s.flash > 0) s.flash--;
      if (!s.alive) { if (s.sink < 300) { s.sink++; s.p[1] -= 0.06; if (s.sink % 6 === 0) this.fx.add(s.p.slice(), [(Math.random() - 0.5) * 0.05, 0.06, (Math.random() - 0.5) * 0.05], 60, '#d0f0ff', 0.4, -0.0005, 'alpha'); } return; }
      const me = this.me;
      let target;
      if (s.red && !this.arcade) {
        // flee along the route; speed up when chased closely
        if (!s.wp) s.wp = 0;
        target = this.route[s.wp];
        if (V3.dist([s.p[0], target[1], s.p[2]], target) < 25) s.wp = (s.wp + 1) % this.route.length;
        const d = V3.dist(s.p, me.p);
        s.v = U.lerp(s.v, d < 45 ? 0.36 : 0.28, 0.02);
        // evasive manoeuvres when the player sits on its tail
        if (s.evade > 0) { s.evade--; target = V3.add(s.p, [Math.sin(s.yaw + s.evDir * 1.4) * 40, s.evDy, Math.cos(s.yaw + s.evDir * 1.4) * 40]); }
        else if (go && d < 70 && this.t % 150 === 0 && Math.random() < 0.7) { s.evade = 80; s.evDir = Math.random() < 0.5 ? -1 : 1; s.evDy = (Math.random() - 0.5) * 24; }
      } else {
        const d = V3.dist(s.p, me.p);
        if (s.red) { if (!s.wp || V3.dist(s.p, s.wp) < 20) s.wp = [(Math.random() - 0.5) * ARENA * 1.4, -15 - Math.random() * 25, (Math.random() - 0.5) * ARENA * 1.4]; target = s.wp; }
        else target = d < 160 ? V3.add(me.p, [Math.sin(s.id) * 25, 0, Math.cos(s.id) * 25]) : (s.wp && V3.dist(s.p, s.wp) > 20 ? s.wp : (s.wp = [(Math.random() - 0.5) * ARENA * 1.4, -15 - Math.random() * 25, (Math.random() - 0.5) * ARENA * 1.4]));
        // fire at the player
        if (go && !s.red && --s.cd <= 0 && d < 90) {
          const f = this.fwd(s.yaw), to = V3.norm(V3.sub(me.p, s.p));
          if (f[0] * to[0] + f[2] * to[2] > 0.8) { this.fire(s, false); s.cd = 200 + U.rand(160); } else s.cd = 20;
        }
      }
      const want = Math.atan2(target[0] - s.p[0], target[2] - s.p[2]);
      let dy = want - s.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      s.yaw += U.clamp(dy, -0.012, 0.012);
      const f = this.fwd(s.yaw);
      s.p[0] += f[0] * s.v; s.p[2] += f[2] * s.v; s.p[1] += U.clamp(target[1] - s.p[1], -0.05, 0.05);
      this.bound(s.p);
      if (V3.dist(s.p, me.p) < 7) { const push = V3.norm(V3.sub(me.p, s.p)); me.p = V3.add(me.p, V3.scale(push, 0.5)); if (me.hurt <= 0) this.damage(5); }
    }
    fire(from, player) {
      const f = this.fwd(from.yaw);
      this.torps.push({ p: V3.add(from.p, V3.scale(f, 5.5)), v: V3.scale(f, player ? 1.3 : 0.8), yaw: from.yaw, life: player ? 200 : 260, player, target: player ? this.lock : this.me });
      if (player) { this.me.cd = 40; MG.sfx('shot3', 0.5); }
    }
    updateTorp(tp) {
      tp.life--;
      const tg = tp.target && (tp.player ? (tp.target.alive ? tp.target.p : null) : this.me.p);
      if (tg) {
        const want = V3.norm(V3.sub(tg, tp.p)), sp = V3.len(tp.v), cur = V3.scale(tp.v, 1 / sp);
        const k = tp.player ? 0.045 : 0.025;
        tp.v = V3.scale(V3.norm(V3.lerp(cur, want, k)), sp);
      }
      tp.p = V3.add(tp.p, tp.v);
      tp.yaw = Math.atan2(tp.v[0], tp.v[2]);
      if (this.t % 3 === 0) this.fx.add(tp.p.slice(), [0, 0.03, 0], 30, '#e0f8ff', 0.18, -0.0003, 'alpha');
      if (tp.p[1] < floorY(tp.p[0], tp.p[2]) + 1) { tp.life = 0; this.boom(tp.p, 1); return; }
      if (tp.player) {
        for (const s of this.subs) if (s.alive && V3.dist(s.p, tp.p) < 4.5) {
          tp.life = 0; this.boom(tp.p, 1.2); s.hp--; s.flash = 12;
          if (s.hp <= 0) { s.alive = false; this.kills++; this.boom(s.p, 2.5); MG.sfx('bosskill', 0.6); this.msg = { text: s.red ? 'Red submarine hit!' : 'Target destroyed!', t: 70 }; }
          return;
        }
        for (const m of this.mines) if (m.alive && V3.dist(m.p, tp.p) < 3) { m.alive = false; tp.life = 0; this.boom(m.p, 1.4); return; }
      } else if (V3.dist(this.me.p, tp.p) < 4) { tp.life = 0; this.boom(tp.p, 1.2); this.damage(12); }
    }
    boom(p, k) { this.fx.burst(p, 18, '#ffd070', 0.25 * k, 26, 0.5 * k, -0.002); this.fx.burst(p, 10, '#ffffff', 0.12 * k, 40, 0.5 * k, -0.003, 'alpha'); MG.sfx('fire2', 0.5); FF7.sceneMgr.doShake(3 * k, 10); }
    damage(n) { this.me.hp = Math.max(0, this.me.hp - n); this.me.hurt = 30; FF7.sceneMgr.doFlash('#ff4040', 8, 0.25); MG.sfx('hit', 0.7); }
    finish(won, text) { this.ending = 1; this.won = won; this.msg = { text, t: 150 }; }
    complete() {
      if (this.done) return;
      const left = Math.max(0, this.limit - this.time) / 60;
      const score = this.won ? Math.round(1000 + left * 20 + this.me.hp * 10 + this.kills * 150 + (this.arcade ? (this.opts.level | 0) * 500 : 0)) : this.kills * 150;
      this.result = this.arcade
        ? { won: this.won, score, level: this.opts.level | 0, kills: this.kills, time: Math.round(this.time / 60), hp: this.me.hp }
        : { won: this.won, score, time: Math.round(left), hp: this.me.hp, kills: this.kills };
      this.done = true;
    }
    idle() { this.fx.update(); }
    bot() {
      if (!this.go || this.ending) return [];
      const me = this.me, out = [];
      const targets = this.subs.filter(s => s.alive && (this.arcade || s.red));
      const tg = targets.sort((a, b) => V3.dist(a.p, me.p) - V3.dist(b.p, me.p))[0];
      if (!tg) return out;
      let aim = tg.p;
      // avoid mines ahead
      const f = this.fwd(me.yaw);
      for (const m of this.mines) { if (!m.alive) continue; const d = V3.sub(m.p, me.p); const ahead = d[0] * f[0] + d[2] * f[2]; if (ahead > 0 && ahead < 25 && Math.abs(d[0] * f[2] - d[2] * f[0]) < 7 && Math.abs(d[1]) < 7) { aim = V3.add(me.p, [f[2] * 20, 0, -f[0] * 20]); break; } }
      const want = Math.atan2(aim[0] - me.p[0], aim[2] - me.p[2]);
      let dy = want - me.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      if (dy > 0.05) out.push('left'); else if (dy < -0.05) out.push('right');
      if (aim[1] < me.p[1] - 2) out.push('up'); else if (aim[1] > me.p[1] + 2) out.push('down');
      const dist = V3.dist(tg.p, me.p);
      if (me.thr < 3 && dist > 30 && this.t % 20 === 0) out.push('menu');
      if (me.thr > 2 && dist < 18 && this.t % 20 === 0) out.push('cancel');
      if (this.lock && me.cd <= 0 && this.t % 2 === 0) out.push('square');
      return out;
    }
    debugLog() { const red = this.subs.find(s => s.red); return `hp=${this.me.hp} kills=${this.kills} red=${red ? red.hp + '@' + V3.dist(red.p, this.me.p).toFixed(0) : '-'} lock=${!!this.lock}`; }

    // ---------------------------------------------------------------- render
    render() {
      const M = meshes(), me = this.me, f = this.fwd(me.yaw);
      MG.sky('#0a3a6a', '#02101e', '#062440');
      if (this.view === 0) this.cam.set(V3.add(me.p, [-f[0] * 13, 4.5, -f[2] * 13]), V3.add(me.p, [f[0] * 12, 0.5, f[2] * 12]), 55, 0.5, 400);
      else this.cam.set(V3.add(me.p, [f[0] * 4.6, 0.8, f[2] * 4.6]), V3.add(me.p, [f[0] * 30, 0.4, f[2] * 30]), 60, 0.5, 400);
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.03, 0.16, 0.28], near: 18, far: 150 }, light: { dir: [0.1, -1, 0.2], color: [0.4, 0.55, 0.6], ambient: [0.34, 0.42, 0.5] } });
      this.cam.apply();
      GL.draw(M.floor, null);
      MG.put(M.surface, [me.p[0] * 0, 0, 0], null, 1, { tint: [1, 1, 1, 0.35] });
      for (const m of this.mines) {
        if (!m.alive || V3.dist(m.p, me.p) > 160) continue;
        MG.put(M.mine, m.p, [0, this.t * 0.01, 0]);
        MG.put(M.chain, m.p, null, [1, m.p[1] - m.fy, 1]);
      }
      for (const s of this.subs) {
        if (s.sink >= 300 || V3.dist(s.p, me.p) > 170) continue;
        const m = s.red ? this.models.red : this.models.yellow;
        m.update && m.update();
        MG.drawModel(m, [s.p[0], s.p[1] + (m.centerY || 0) - (m.baseY || 0), s.p[2]], s.yaw, s.alive ? 0 : Math.min(0.6, s.sink * 0.004), s.alive ? 0 : s.sink * 0.004, s.flash > 0 ? { add: [0.6, 0.4, 0.2] } : null);
      }
      if (this.view === 0) { const m = this.models.me; m.update && m.update(); MG.drawModel(m, [me.p[0], me.p[1] + (m.centerY || 0) - (m.baseY || 0), me.p[2]], me.yaw, -me.vy * 2, me.bank, me.hurt > 0 && (this.t >> 2) % 2 ? { add: [0.5, 0.1, 0.1] } : null); }
      for (const tp of this.torps) { MG.put(M.torpedo, tp.p, [0, tp.yaw, 0]); MG.put(M.glow, V3.sub(tp.p, V3.scale(V3.norm(tp.v), 1.3)), null, 0.4, { tint: [1, 1, 1, 0.8] }); }
      this.fx.draw();
      GL.end();
      this.renderHUD();
    }
    renderHUD() {
      const me = this.me;
      R.window(12, 10, 150, 40);
      R.text('TIME', 22, 15, { size: 12, color: R.COL.cyan });
      R.text(MG.fmtClock(this.limit - this.time), 150, 22, { size: 17, align: 'right', color: this.limit - this.time < 1800 && (this.t >> 4) % 2 ? '#ff6060' : R.COL.white });
      ui.gauge('HULL', W - 212, 10, 200, me.hp / 100, me.hp > 30 ? '#3070e0' : '#d04040', me.hp > 30 ? '#80e0ff' : '#ffa060', String(me.hp));
      // speed + depth
      R.window(12, H - 58, 170, 46);
      R.text('SPEED', 22, H - 52, { size: 11, color: R.COL.cyan });
      for (let i = 1; i <= 3; i++) { R.ctx.fillStyle = i <= me.thr ? '#80e0ff' : '#303040'; R.ctx.fillRect(22 + (i - 1) * 16, H - 34, 12, 14); }
      R.text('DEPTH', 90, H - 52, { size: 11, color: R.COL.cyan });
      R.text(`${Math.round(-me.p[1] * 3)} m`, 170, H - 36, { size: 15, align: 'right' });
      // targets left
      const left = this.subs.filter(s => s.alive).length;
      R.window(W / 2 - 70, 10, 140, 34);
      R.text(this.arcade ? `TARGETS ${left}` : (this.subs.some(s => s.red && s.alive) ? 'TARGET: RED SUB' : 'TARGET DOWN'), W / 2, 17, { size: 13, align: 'center', color: '#ffe060' });
      // radar
      const cx = W - 70, cy = H - 70, rr = 56, range = 160;
      const c = R.ctx;
      c.save(); c.fillStyle = 'rgba(0,30,20,0.75)'; c.beginPath(); c.arc(cx, cy, rr, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#40c080'; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.arc(cx, cy, rr / 2, 0, Math.PI * 2); c.stroke();
      const sweep = (this.t * 0.05) % (Math.PI * 2); c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sweep) * rr, cy + Math.sin(sweep) * rr); c.stroke();
      const blip = (p, col, sz) => {
        const dx = p[0] - me.p[0], dz = p[2] - me.p[2];
        const cs = Math.cos(-me.yaw), sn = Math.sin(-me.yaw);
        const lx = dx * cs + dz * sn, lz = -dx * sn + dz * cs;      // lz = forward, lx = left(+)
        const d = Math.hypot(lx, lz); if (d > range) return;
        c.fillStyle = col; c.fillRect(cx - lx / range * rr - sz / 2, cy - lz / range * rr - sz / 2, sz, sz);
      };
      this.subs.forEach(s => s.alive && blip(s.p, s.red ? '#ff4040' : '#ffe040', 5));
      this.mines.forEach(m => m.alive && blip(m.p, '#a0a0a0', 2));
      c.fillStyle = '#ffffff'; c.fillRect(cx - 2, cy - 2, 4, 4);
      c.restore();
      // lock-on reticle
      if (this.lock) {
        const q = this.cam.project(this.lock.p);
        if (q.visible) { c.save(); c.strokeStyle = (this.t >> 3) % 2 ? '#ff4040' : '#ffe040'; c.lineWidth = 2; const s = 18; c.strokeRect(q.x - s, q.y - s, s * 2, s * 2); c.restore(); R.text('LOCK', q.x, q.y - s - 16, { size: 11, align: 'center', color: '#ff6060' }); }
      }
      // sonar map
      if (this.sonar) {
        R.window(120, 60, 400, 360);
        const mx = (x) => 320 + x / ARENA * 180, mz = (z) => 240 - z / ARENA * 170;
        c.save(); c.fillStyle = '#062030'; c.fillRect(140, 70, 360, 340);
        this.mines.forEach(m => { if (m.alive) { c.fillStyle = '#909090'; c.fillRect(mx(m.p[0]) - 1, mz(m.p[2]) - 1, 3, 3); } });
        this.subs.forEach(s => { if (s.alive) { c.fillStyle = s.red ? '#ff4040' : '#ffe040'; c.fillRect(mx(s.p[0]) - 3, mz(s.p[2]) - 3, 6, 6); } });
        c.fillStyle = '#ffffff'; c.beginPath(); c.arc(mx(me.p[0]), mz(me.p[2]), 4, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#ffffff'; c.beginPath(); c.moveTo(mx(me.p[0]), mz(me.p[2])); c.lineTo(mx(me.p[0] + Math.sin(me.yaw) * 30), mz(me.p[2] + Math.cos(me.yaw) * 30)); c.stroke();
        c.restore();
        R.text('SONAR', 320, 74, { size: 13, align: 'center', color: R.COL.cyan });
      }
      ui.readyGo(this.t, 190);
      if (this.msg) ui.big(this.msg.text, 150, this.ending && !this.won ? '#ff8080' : '#ffe060', 28, Math.min(1, this.msg.t / 20));
    }
    resultTitle(r) { return r.won ? (this.arcade ? 'MISSION CLEAR!' : 'HUGE MATERIA SECURED!') : 'MISSION FAILED'; }
    resultRows(r) {
      const rows = [['Targets destroyed', r.kills], ['Hull', `${r.hp}%`]];
      if (this.arcade) rows.unshift(['Stage', this.level.name]);
      else rows.push(['Time left', MG.fmtClock((r.time || 0) * 60)]);
      rows.push(['Score', U.fmtNum(r.score), '#ffe060']);
      return rows;
    }
  }

  MG.register('submarine', {
    title: 'Submarine Battle',
    music: () => 'deepsea',
    help: (o) => o.mode === 'arcade' ? {
      title: 'TORPEDO ATTACK  ' + (LEVELS[U.clamp(o.level | 0, 0, 4)].name.toUpperCase()),
      lines: ['Destroy every enemy submarine before time runs out. Watch out for mines!', 'Get behind a sub until it locks on, then fire. Hold R1 for the sonar map.'],
      controls: [[['left', 'right'], 'Turn'], [['up', '/', 'down'], 'Dive / rise'], [['menu', '/', 'cancel'], 'Speed up / slow down'], [['square'], 'Torpedo'], [['r1'], 'Sonar'], [['r2'], 'Change view']],
    } : {
      title: 'SUBMARINE',
      lines: ['The red submarine is carrying the Huge Materia! Sink it before it gets away.', 'Get behind it until it locks on, then fire torpedoes. Hold R1 for the sonar map if you lose track of it.'],
      controls: [[['left', 'right'], 'Turn'], [['up', '/', 'down'], 'Dive / rise'], [['menu', '/', 'cancel'], 'Speed up / slow down'], [['square'], 'Torpedo'], [['r1'], 'Sonar'], [['r2'], 'Change view']],
    },
    create: (opts, scene) => new SubGame(opts, scene),
  });
})();
