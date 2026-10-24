// Motorcycle chase: the Midgar highway escape (Cloud on the Hardy-Daytona guards the truck from
// Shinra bikers) and the Gold Saucer G-Bike arcade (opts.mode === 'gbike').
//   Left/Right steer, Up/Down speed, □ slash left, ○ slash right.
//   Orange bikers go for the truck, red bikers harass Cloud and lure him away (Gold Saucer FAQ).
//   Story result { won, score: kills, truckHp, kills, hits, cloudHits }  (truck hits cost the party HP)
//   G-Bike result { won, score: 500 per kill - 25 per car hit, kills, hits, carHp }
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const SEG = 10, NSEG = 20, EDGE = 7.2;
  const curveX = (d) => 26 * Math.sin(d / 330) + 9 * Math.sin(d / 121 + 1.3);
  const slopeX = (d) => 26 / 330 * Math.cos(d / 330) + 9 / 121 * Math.cos(d / 121 + 1.3);
  const SLASH = 20;

  // ------------------------------------------------------------------ static meshes
  let MESH = null;
  function meshes() {
    if (MESH) return MESH;
    MESH = {};
    // one 10 m road segment, built along -z from z=0
    MESH.road = MG.mesh(mb => {
      for (let i = 0; i < 4; i++) mb.floor(-EDGE - 0.6 + i * 3.9, -SEG, -EDGE - 0.6 + (i + 1) * 3.9, 0, 0, i % 2 ? '#2e3040' : '#2b2d3c');
      mb.floor(-EDGE - 1.4, -SEG, -EDGE - 0.6, 0, 0, '#3a3a44'); mb.floor(EDGE + 0.6, -SEG, EDGE + 1.4, 0, 0, '#3a3a44');
      [-3.6, 0, 3.6].forEach(x => { mb.floor(x - 0.08, -4.5, x + 0.08, -0.5, 0.01, '#d8d8d0'); });
      [-EDGE, EDGE].forEach(x => mb.floor(x - 0.1, -SEG, x + 0.1, 0, 0.01, '#e0b030'));
      // concrete barriers + rail
      [-1, 1].forEach(sd => {
        const x = sd * (EDGE + 1.6);
        mb.frustum(x, 0, -SEG / 2, 0.7, SEG, 0.35, SEG, 0.85, { side: '#6a6a74', top: '#8a8a94' });
        mb.box(x, 1.1, -SEG / 2, 0.12, 0.12, SEG, '#9aa0aa');
        for (let z = 0; z > -SEG; z -= 2.5) mb.box(x, 0.95, z - 0.2, 0.08, 0.3, 0.08, '#707080');
      });
      // the underside of the elevated road
      mb.push(); mb.translate(0, -0.6, -SEG / 2); mb.box(0, 0, 0, EDGE * 2 + 4, 1.2, SEG, '#1a1a24'); mb.pop();
    });
    MESH.pillar = MG.mesh(mb => { mb.box(0, -14, 0, 3, 26, 2.2, '#24242e'); mb.box(0, -1.4, 0, EDGE * 2 + 5, 1.2, 2.6, '#2a2a34'); });
    MESH.lamp = MG.mesh(mb => {
      mb.box(0, 3.6, 0, 0.18, 7.2, 0.18, '#50505c');
      mb.box(-1.4, 7.1, 0, 2.8, 0.14, 0.16, '#50505c');
      mb.box(-2.7, 6.95, 0, 0.7, 0.18, 0.35, '#303038');
    });
    MESH.lampGlow = MG.mesh(mb => { mb.box(-2.7, 6.84, 0, 0.6, 0.05, 0.3, '#ffe8a0'); }, { unlit: true });
    MESH.glowPuff = MG.mesh(mb => mb.sphere(0, 0, 0, 1, 1, 1, '#ffd070', 8, 5, true), { unlit: true, blend: 'add' });
    MESH.pipe = MG.mesh(mb => { mb.push(); mb.rotate(0, 0, 0); mb.box(0, -0.25, 0, 0.04, 0.55, 0.04, '#b0b4bc'); mb.pop(); });
    // distant Midgar skyline (camera-relative)
    MESH.city = MG.mesh(mb => {
      const rnd = MG.rng('midgar-skyline');
      for (let i = 0; i < 120; i++) {
        const a = i / 120 * Math.PI * 2 + rnd() * 0.03, r = 150 + rnd() * 50;
        const h = 8 + rnd() * rnd() * 45, w = 5 + rnd() * 9;
        const x = Math.sin(a) * r, z = Math.cos(a) * r;
        mb.push(); mb.translate(x, -20, z); mb.rotate(0, a, 0);
        mb.box(0, h / 2, 0, w, h, w, U.mix('#141626', '#262a3c', rnd()));
        for (let k = 0; k < 6; k++) if (rnd() < 0.7) mb.box((rnd() - 0.5) * w * 0.8, rnd() * h, -w / 2 - 0.1, 0.6, 0.5, 0.1, rnd() < 0.8 ? '#e8c060' : '#80c0ff');
        mb.pop();
      }
      // the plate and a pair of reactors
      mb.push(); mb.translate(0, -20, 0);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; if (Math.cos(a) < -0.2) continue; mb.push(); mb.rotate(0, a, 0); mb.frustum(0, 34, 175, 60, 10, 60, 10, 7, '#1c1e2a'); mb.box(0, 17, 175, 4, 34, 4, '#181a24'); mb.pop(); }
      [[0.3, 190], [0.9, 185]].forEach(([a, r]) => { mb.push(); mb.rotate(0, a, 0); mb.prism(0, 20, r, 4, 3, 40, 8, '#2a2a36'); mb.pop(); });
      mb.pop();
    });
    MESH.reactorGlow = MG.mesh(mb => { [[0.3, 190], [0.9, 185]].forEach(([a, r]) => { mb.push(); mb.rotate(0, a, 0); mb.prism(0, 38, r, 3.2, 2.4, 3, 8, '#60ff90'); mb.pop(); }); }, { unlit: true });
    return MESH;
  }

  // ------------------------------------------------------------------ poses
  function ridePose(m, o) {
    const b = (n) => m.b(n);
    b('hips').rot[0] = 0.25;
    b('thighL').rot[0] = -1.35; b('thighR').rot[0] = -1.35; b('thighL').rot[2] = 0.22; b('thighR').rot[2] = -0.22;
    b('shinL').rot[0] = 1.45; b('shinR').rot[0] = 1.45;
    b('torso').rot[0] = 0.28; b('head').rot[0] = -0.4;
    b('armL').rot[0] = -1.15; b('foreL').rot[0] = -0.35; b('armL').rot[2] = 0.18;
    b('armR').rot[0] = -1.15; b('foreR').rot[0] = -0.35; b('armR').rot[2] = -0.18;
    b('torso').rot[2] = (o.lean || 0) * 0.6;
    if (o.swing > 0) {           // sword swing: side +1 = to the rider's right (screen right), -1 = left
      const p = 1 - o.swing / SLASH, sd = o.side;
      const e = p < 0.3 ? p / 0.3 : 1 - Math.pow(1 - Math.min(1, (p - 0.3) / 0.45), 2);
      b('torso').rot[1] = -sd * 0.7 * Math.sin(Math.min(1, p) * Math.PI);
      b('armR').rot[0] = -1.35;
      b('foreR').rot[0] = -0.15;
      b('armR').rot[2] = sd > 0 ? U.lerp(0.9, -1.7, e) : U.lerp(-1.3, 1.6, e);
      b('head').rot[1] = -sd * 0.4;
    }
    if (o.hurt > 0) { b('torso').rot[0] = -0.3; b('head').rot[0] = 0.3; }
  }

  // ------------------------------------------------------------------ the game
  class BikeGame {
    constructor(opts, scene) {
      this.opts = opts; this.scene = scene;
      this.gbike = opts.mode === 'gbike';
      this.t = 0; this.done = false; this.result = null;
      const M = meshes();
      this.cam = new MG.Cam();
      this.fx = new MG.Particles();
      this.length = opts.length || (this.gbike ? 4600 : 3800);         // metres to ride
      this.timeLimit = this.gbike ? 60 * 95 : 0;
      this.cloud = { x: -3.2, d: 0, v: 0.8, vx: 0, slash: 0, side: 1, hurt: 0, lean: 0 };
      this.truck = { x: 0, d: 7, v: 0.8, hp: 100, maxHp: 100, flash: 0 };
      this.bikers = [];
      this.kills = 0; this.hits = 0; this.cloudHits = 0; this.spawnT = 150;
      this.ending = 0;
      this.msg = null;
      // models (vehicles.js models are in field units: same scale as the riders)
      const CS = this.CS = 1.5;
      this.bike = MG.vehicleModel('motorcycle', CS, 2.6);
      const V = FF7.vehicles3d;
      this.enemyBike = V && V.has && V.has('shinra_bike') ? MG.vehicleModel('shinra_bike', CS, 2.5) : MG.fit(MG.fb.motorcycle({ color: '#3a4c80', trim: '#c0c4cc' }), 2.5, 'length');
      this.truckM = MG.vehicleModel('truck', CS, 4.6);
      const tb = MG.bbox(this.truckM);
      this.truckHW = (tb.mx[0] - tb.mn[0]) * this.truckM.scale / 2 + 0.6;
      this.truckHL = (tb.mx[2] - tb.mn[2]) * this.truckM.scale / 2 + 0.9;
      this.cloudM = MG.char('cloud', { weapon: true });
      this.cloudM.scale = CS;
      this.riders = {
        orange: MG.char({ base: 'soldier', top: '#c86a20', sleeve: '#c86a20', bottom: '#8a4a1a', helmetColor: '#d07020' }),
        red: MG.char('soldier_red'),
      };
      for (const k in this.riders) { const m = this.riders[k]; m.scale = CS * 0.97; m.attach('handR', M.pipe); }
      this.party = this.gbike ? [] : ['barret', 'tifa', 'aeris'].map(id => { const m = MG.char(id); m.scale = CS * 0.85; m.play(m.anims && m.anims.idle || 'idle'); return m; });
    }
    hipsY(m) { return (m.bones && m.bones.hips ? m.bones.hips.offset[1] : 0.41) * m.scale; }
    // place a rider model on a vehicle seat
    drawRider(rider, veh, pos, yaw, roll, opts, seat) {
      const sp = MG.seat(veh, seat || 'rider', pos, yaw, [0, 0.8, -0.3]);
      MG.drawModel(rider, [sp[0], sp[1] - this.hipsY(rider) + 0.04, sp[2]], yaw, 0, roll, opts);
    }
    get ref() { return this.cloud.d; }
    toWorld(x, d, h) {
      const r = this.ref, dd = d - r;
      return [x + curveX(d) - curveX(r) - slopeX(r) * dd, h || 0, -dd];
    }
    yawAt(d) { return -Math.atan(slopeX(d) - slopeX(this.ref)); }
    active() { return this.t >= MG.READY && !this.ending; }

    spawn() {
      const c = this.cloud, T = this.truck;
      const red = Math.random() < (this.gbike ? 0.45 : 0.35);
      const front = Math.random() < 0.22;
      const side = Math.random() < 0.5 ? -1 : 1;
      this.bikers.push({
        type: red ? 'red' : 'orange', side, off: U.lerp(-1.4, 1.4, Math.random()),
        x: side * U.lerp(3, 6, Math.random()), d: front ? T.d + 55 : c.d - 26, v: front ? 0.55 : 1.05, vx: 0,
        swing: 0, cd: 50 + U.rand(60), state: 'ride', t: 0, down: 0,
      });
    }

    update(I) {
      this.t++;
      const c = this.cloud, T = this.truck;
      this.fx.update();
      if (T.flash > 0) T.flash--;
      if (this.msg && --this.msg.t <= 0) this.msg = null;
      // ---- truck
      T.x = Math.sin(this.t / 170) * 1.3;
      T.d += T.v;
      // ---- Cloud
      const go = this.active();
      const dir = go ? I.dir() : { x: 0, y: 0 };
      if (c.hurt > 0) c.hurt--;
      const steer = c.hurt > 0 ? 0 : dir.x;
      c.vx += steer * 0.04; c.vx *= 0.87; c.x += c.vx;
      c.lean = U.lerp(c.lean, -c.vx * 3.2, 0.2);
      if (Math.abs(c.x) > EDGE - 0.4) {                 // scraping the barrier
        c.x = U.clamp(c.x, -EDGE + 0.4, EDGE - 0.4); c.vx *= -0.3;
        if (this.t % 3 === 0) this.fx.add([c.x + Math.sign(c.x) * 0.4, 0.3, c.d], [(Math.random() - 0.5) * 0.05, 0.08, -0.25], 20, '#ffc040', 0.08, 0.01);
      }
      const rel = c.d - T.d;
      let tv = 0.8 + U.clamp(-rel - 3, -4, 4) * 0.012;  // drifts toward riding alongside the truck
      if (dir.y < 0) tv = 1.02; else if (dir.y > 0) tv = 0.6;
      if (rel > 7) tv = Math.min(tv, 0.74); if (rel < -18) tv = Math.max(tv, 0.92);
      if (!go) tv = 0.8;
      c.v += (tv - c.v) * 0.05; c.d += c.v;
      // truck collision (push aside)
      if (Math.abs(c.x - T.x) < this.truckHW && Math.abs(c.d - T.d) < this.truckHL) { c.x = T.x + Math.sign(c.x - T.x || 1) * this.truckHW; c.vx = Math.sign(c.x - T.x) * 0.08; }
      // slash
      if (c.slash > 0) c.slash--;
      if (go && c.slash <= 4 && c.hurt <= 0) {
        if (I.pressed('square')) { c.slash = SLASH; c.side = -1; MG.sfx('run_attack', 0.6); }
        else if (I.pressed('ok')) { c.slash = SLASH; c.side = 1; MG.sfx('run_attack', 0.6); }
      }
      const slashActive = c.slash > 6 && c.slash <= 15;
      // ---- bikers
      if (go) {
        const maxB = (this.gbike ? 3 : 2) + Math.min(2, Math.floor(this.t / 1600));
        if (--this.spawnT <= 0 && this.bikers.filter(b => b.state === 'ride').length < maxB) { this.spawn(); this.spawnT = 90 + U.rand(100); }
      }
      for (const b of this.bikers) this.updateBiker(b, slashActive);
      this.bikers = this.bikers.filter(b => !b.gone);
      // ---- end conditions
      const dist = c.d;
      if (!this.ending) {
        if (!this.gbike && dist >= this.length) this.finish();
        if (this.gbike && (this.t - MG.READY >= this.timeLimit || T.hp <= 0)) this.finish();
      } else if (++this.ending > 110) this.complete();
    }
    updateBiker(b, slashActive) {
      const c = this.cloud, T = this.truck;
      b.t++;
      if (b.state === 'down') {            // knocked off: rider tumbles, bike skids
        b.down++;
        b.x += b.vx; b.vx *= 0.97; b.d += b.v; b.v *= 0.97;
        b.ry += b.vy; b.vy -= 0.02; if (b.ry < 0) { b.ry = 0; b.vy = Math.abs(b.vy) * 0.3; }
        b.spin += 0.2;
        if (b.down % 4 === 0 && b.down < 40) this.fx.add([b.x, 0.2, b.d], [(Math.random() - 0.5) * 0.1, 0.06, (Math.random() - 0.5) * 0.1], 16, '#ffb040', 0.09, 0.008);
        if (b.down > 90 || b.d < c.d - 30) b.gone = true;
        return;
      }
      if (this.ending) { b.v += 0.004; b.d += b.v * 0.5; b.x += b.side * 0.05; if (b.d < c.d - 30 || Math.abs(b.x) > 12) b.gone = true; return; }
      // target
      let tx, td;
      const strayed = Math.abs(c.x - T.x) > 4.5 || Math.abs(c.d - T.d) > 10;
      if (b.type === 'orange' || strayed) { tx = T.x + b.side * (this.truckHW + 0.9); td = T.d + b.off; b.target = 'truck'; }
      else { tx = c.x + b.side * 2.3; td = c.d + b.off * 0.4; b.target = 'cloud'; }
      tx = U.clamp(tx, -EDGE + 0.6, EDGE - 0.6);
      const dd = td - b.d;
      b.v += (U.clamp(0.8 + dd * 0.035, 0.45, 1.15) - b.v) * 0.06; b.d += b.v;
      b.vx += U.clamp((tx - b.x) * 0.02, -0.035, 0.035); b.vx *= 0.9; b.x += b.vx;
      b.x = U.clamp(b.x, -EDGE + 0.4, EDGE - 0.4);
      // bump with Cloud
      if (Math.abs(b.x - c.x) < 0.95 && Math.abs(b.d - c.d) < 1.9) { const s = Math.sign(b.x - c.x) || 1; b.vx = s * 0.12; c.vx = -s * 0.12; }
      // truck blocks bikers too
      if (Math.abs(b.x - T.x) < this.truckHW && Math.abs(b.d - T.d) < this.truckHL) { b.x = T.x + Math.sign(b.x - T.x || 1) * this.truckHW; }
      // Cloud's sword
      if (slashActive && Math.abs(b.d - c.d) < 2.5) {
        const off = (b.x - c.x) * c.side;
        if (off > 0.2 && off < 3.3) this.knock(b);
      }
      if (b.state !== 'ride') return;
      // attack
      if (b.swing > 0) {
        b.swing--;
        if (b.swing === 9) {
          if (b.target === 'truck' && Math.abs(b.x - T.x) < this.truckHW + 1.7 && Math.abs(b.d - T.d) < this.truckHL + 0.4) {
            T.hp = Math.max(0, T.hp - (this.gbike ? 3 : 4)); T.flash = 10; this.hits++;
            MG.sfx('hit', 0.7); this.fx.burst([(b.x + T.x) / 2, 1.2, b.d], 8, '#ffe080', 0.12, 16, 0.1, 0.01);
            if (!this.gbike) FF7.sceneMgr.doShake(2, 6);
          } else if (b.target === 'cloud' && Math.abs(b.x - c.x) < 3.1 && Math.abs(b.d - c.d) < 2.3 && c.hurt <= 0) {
            c.hurt = 28; c.vx = Math.sign(c.x - b.x || 1) * 0.22; this.cloudHits++;
            MG.sfx('hit', 0.8); this.fx.burst([(b.x + c.x) / 2, 1.3, c.d], 8, '#ffe080', 0.12, 16, 0.1, 0.01);
            FF7.sceneMgr.doShake(3, 8);
          }
        }
      } else if (--b.cd <= 0 && Math.abs(dd) < 2 && Math.abs(tx - b.x) < 1.0) { b.swing = 22; b.cd = 60 + U.rand(60); }
    }
    knock(b) {
      b.state = 'down'; b.down = 0; b.vx = Math.sign(b.x - this.cloud.x || 1) * 0.16; b.ry = 0.2; b.vy = 0.28; b.spin = 0; b.v = this.cloud.v * 0.8;
      this.kills++;
      MG.sfx('crit', 0.9);
      this.fx.burst([b.x, 1.4, b.d], 14, '#fff0a0', 0.18, 20, 0.12, 0.012);
      FF7.sceneMgr.doShake(2, 6);
    }
    finish() {
      this.ending = 1;
      this.msg = { text: this.gbike ? (this.truck.hp > 0 ? 'TIME UP!' : 'CAR DESTROYED...') : 'Shook them off!', t: 110 };
    }
    complete() {
      if (this.done) return;
      const T = this.truck;
      if (this.gbike) {
        const score = Math.max(0, this.kills * 500 - this.hits * 25);
        this.result = { won: T.hp > 0, score, kills: this.kills, hits: this.hits, carHp: T.hp };
      } else {
        this.result = { won: T.hp > 0, score: this.kills, truckHp: T.hp, kills: this.kills, hits: this.hits, cloudHits: this.cloudHits };
        if (!this.opts.noDamage) this.applyDamage();
      }
      this.done = true;
    }
    // FF7: bikers hitting the truck hurt the party riding in it (and Cloud when he is hit). Never lethal.
    applyDamage() {
      const st = FF7.state; if (!st || !st.chars) return;
      const hurt = (id, frac) => { const ch = st.chars[id]; if (!ch || !ch.maxHp) return; ch.hp = Math.max(1, ch.hp - Math.round(ch.maxHp * frac)); };
      const others = (st.party || []).filter(id => id && id !== 'cloud' && st.chars[id]);
      for (let i = 0; i < this.hits; i++) if (others.length) hurt(others[i % others.length], 0.03);
      if (st.chars.cloud) hurt('cloud', Math.min(0.6, this.cloudHits * 0.04));
    }
    idle() { this.fx.update(); }

    // ---------------------------------------------------------------- bot
    bot() {
      const c = this.cloud, T = this.truck, out = [];
      if (!this.active()) return out;
      // nearest threatening biker
      let best = null, bd = 1e9;
      for (const b of this.bikers) {
        if (b.state !== 'ride') continue;
        const dist = Math.abs(b.d - c.d) * 1.5 + Math.abs(b.x - c.x) + (b.target === 'truck' ? -6 : 0);
        if (dist < bd) { bd = dist; best = b; }
      }
      let tx = T.x - 3.3, td = T.d - 1;
      if (best) { tx = best.x - Math.sign(best.x - T.x || 1) * 1.9; td = best.d; if (Math.abs(tx - T.x) < 2) tx = T.x + Math.sign(tx - T.x || 1) * 2.2; }
      if (tx > c.x + 0.4) out.push('right'); else if (tx < c.x - 0.4) out.push('left');
      if (td > c.d + 1.2) out.push('up'); else if (td < c.d - 1.2) out.push('down');
      if (best && c.slash <= 0 && this.t % 2 === 0 && Math.abs(best.d - c.d) < 2.2) {
        const off = best.x - c.x;
        if (off > 0.4 && off < 3.1) out.push('ok'); else if (off < -0.4 && off > -3.1) out.push('square');
      }
      return out;
    }
    debugLog() { return `d=${Math.round(this.cloud.d)} truck=${this.truck.hp} kills=${this.kills} hits=${this.hits} bikers=${this.bikers.length}`; }

    // ---------------------------------------------------------------- render
    render() {
      const M = meshes(), c = this.cloud, T = this.truck;
      MG.sky('#070818', '#2a1838', '#120f2c');
      // camera (behind Cloud, looking up the road)
      const ce = [c.x * 0.6, 2.7, 5.6], ct = [c.x * 0.75, 1.2, -12];
      this.cam.set(ce, ct, 55, 0.3, 400);
      // pass 1: skyline (no fog)
      GL.begin({ clear: [0, 0, 0, 0], light: { dir: [-0.3, -0.8, -0.4], color: [0.35, 0.33, 0.4], ambient: [0.5, 0.5, 0.6] } });
      this.cam.apply();
      const bgYaw = -Math.atan(slopeX(this.ref)) * 1.6;
      MG.put(M.city, [0, 0, 0], [0, bgYaw, 0]);
      MG.put(M.reactorGlow, [0, 0, 0], [0, bgYaw, 0], 1, { add: [0.1 * Math.sin(this.t * 0.05), 0.1 * Math.sin(this.t * 0.05), 0.1 * Math.sin(this.t * 0.05)] });
      GL.end();
      // pass 2: highway + actors
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: [0.07, 0.06, 0.15], near: 60, far: 190 }, light: { dir: [-0.2, -0.9, -0.35], color: [0.7, 0.62, 0.5], ambient: [0.36, 0.36, 0.48] }, curve: 0.00016, curveCenter: [0, 0, 0] });
      this.cam.apply();
      const d0 = Math.floor((this.ref - 20) / SEG) * SEG;
      for (let k = 0; k < NSEG; k++) {
        const d = d0 + k * SEG;
        const p = this.toWorld(0, d, 0), yaw = this.yawAt(d);
        MG.put(M.road, p, [0, yaw, 0]);
        if ((d / SEG) % 3 === 0) { [-1, 1].forEach(sd => { const q = this.toWorld(sd * (EDGE + 2.2), d, 0); MG.put(M.lamp, q, [0, yaw + (sd > 0 ? 0 : Math.PI), 0]); MG.put(M.lampGlow, q, [0, yaw + (sd > 0 ? 0 : Math.PI), 0]); }); }
        if ((d / SEG) % 5 === 0) MG.put(M.pillar, p, [0, yaw, 0]);
      }
      // truck (+ party in the back)
      const tp = this.toWorld(T.x, T.d, 0), tyaw = Math.PI + this.yawAt(T.d);
      this.truckM.update();
      MG.drawModel(this.truckM, tp, tyaw, 0, Math.sin(this.t * 0.3) * 0.01, T.flash > 0 ? { add: [0.4, 0.1, 0.1] } : null);
      this.party.forEach((m, i) => {
        m.update();
        const q = MG.seat(this.truckM, 'cargo', tp, tyaw, [0, 0.9, -0.6]);
        const off = [(i - 1) * 0.55, 0, -0.25 * (i % 2)];
        MG.drawModel(m, [q[0] + off[0] * Math.cos(tyaw) + off[2] * Math.sin(tyaw), q[1] - 0.05, q[2] - off[0] * Math.sin(tyaw) + off[2] * Math.cos(tyaw)], tyaw + Math.PI, 0, 0);
      });
      // bikers
      for (const b of this.bikers) this.drawBiker(b);
      // Cloud
      const cp = this.toWorld(c.x, c.d, 0), cyaw = Math.PI + this.yawAt(c.d) - c.vx * 1.5;
      const roll = c.lean * 0.5;
      MG.shadow(cp[0], 0, cp[2], 1.1, 0.4);
      this.bike.update();
      MG.drawModel(this.bike, cp, cyaw, 0, roll);
      this.cloudM.onPose = (m) => ridePose(m, { swing: c.slash, side: c.side, lean: c.lean, hurt: c.hurt });
      this.cloudM.update();
      this.drawRider(this.cloudM, this.bike, cp, cyaw, roll, c.hurt > 0 && (this.t >> 2) % 2 ? { add: [0.5, 0.2, 0.2] } : null);
      // headlight glow + sword arc
      if (c.slash > 4) {
        const k = c.slash / SLASH;
        const sp = this.toWorld(c.x + c.side * 1.6, c.d, 1.3);
        MG.put(M.glowPuff, sp, null, [1.4, 0.18, 0.5], { tint: [0.8, 0.9, 1, 0.35 * k] });
      }
      this.fx.draw((q) => this.toWorld(q[0], q[2], q[1]));
      GL.end();
      this.renderHUD();
    }
    drawBiker(b) {
      const M = meshes();
      const rider = this.riders[b.type];
      const p = this.toWorld(b.x, b.d, 0), yaw = Math.PI + this.yawAt(b.d) - b.vx * 1.5;
      if (b.state === 'down') {
        MG.drawModel(this.enemyBike, p, yaw + b.spin * 0.6, 0, b.side * 1.3 * Math.min(1, b.down / 10));
        rider.onPose = (m) => { m.b('armL').rot[2] = 1.2; m.b('armR').rot[2] = -1.2; m.b('thighL').rot[0] = -0.6; };
        rider.update();
        const q = this.toWorld(b.x + Math.sign(b.vx) * b.down * 0.03, b.d + 0.5, 0.6 + b.ry * 2);
        MG.drawModel(rider, q, yaw + b.spin, b.spin * 0.7, 0);
        return;
      }
      MG.shadow(p[0], 0, p[2], 1.0, 0.35);
      const roll = -b.vx * 2;
      MG.drawModel(this.enemyBike, p, yaw, 0, roll);
      const side = b.target === 'truck' ? Math.sign(this.truck.x - b.x || 1) : Math.sign(this.cloud.x - b.x || 1);
      rider.onPose = (m) => ridePose(m, { swing: b.swing > 0 ? Math.round(b.swing * SLASH / 22) : 0, side, lean: -b.vx * 3 });
      rider.update();
      this.drawRider(rider, this.enemyBike, p, yaw, roll);
    }
    renderHUD() {
      const T = this.truck;
      if (this.gbike) {
        ui.gauge('CAR', 12, 10, 200, T.hp / T.maxHp, '#d04040', '#ffa060', `${T.hp}`);
        R.window(W - 212, 10, 200, 58);
        R.text('SCORE', W - 200, 16, { size: 12, color: R.COL.cyan });
        R.text(U.fmtNum(Math.max(0, this.kills * 500 - this.hits * 25)), W - 24, 14, { size: 18, align: 'right' });
        R.text('TIME', W - 200, 42, { size: 12, color: R.COL.cyan });
        R.text(MG.fmtClock(this.timeLimit - Math.max(0, this.t - MG.READY)), W - 24, 40, { size: 16, align: 'right' });
      } else {
        ui.gauge('TRUCK', 12, 10, 200, T.hp / T.maxHp, T.hp > 30 ? '#3070e0' : '#d04040', T.hp > 30 ? '#80e0ff' : '#ffa060', `${T.hp}/${T.maxHp}`);
        R.window(W - 212, 10, 200, 40);
        R.text('DISTANCE', W - 200, 15, { size: 12, color: R.COL.cyan });
        R.bar(W - 200, 34, 176, 6, this.cloud.d / this.length, '#40a040', '#c0ff90');
      }
      ui.readyGo(this.t, 180);
      if (this.msg) ui.big(this.msg.text, 170, '#ffe060', 38, Math.min(1, this.msg.t / 20));
    }
    resultTitle(r) { return this.gbike ? (r.won ? 'FINISH!' : 'GAME OVER') : (r.won ? 'ESCAPED!' : 'ESCAPED... BARELY'); }
    resultRows(r) {
      if (this.gbike) return [['Bikers knocked down', r.kills], ['Hits on the car', r.hits], ['Score', U.fmtNum(r.score), '#ffe060']];
      return [['Bikers knocked down', r.kills], ['Truck', `${r.truckHp}/100`], ['Hits taken', r.cloudHits]];
    }
  }

  MG.register('motorcycle', {
    title: 'Motorcycle Chase',
    music: () => 'motorcycle',
    help: (o) => o.mode === 'gbike' ? {
      title: 'G-BIKE',
      lines: ['Protect the car from the Shinra bikers! Each biker you knock down is worth 500 points, but every hit on the car costs 25.',
        'Orange bikers go straight for the car. Red bikers try to lure you away from it.'],
      controls: [[['left', 'right'], 'Steer'], [['up', 'down'], 'Speed up / slow down'], [['square'], 'Swing sword to the left'], [['ok'], 'Swing sword to the right']],
    } : {
      title: 'MOTORCYCLE',
      lines: ['Shinra’s troops are chasing the truck down the highway! Ride alongside and cut the bikers down before they wreck it.',
        'When they hit the truck, your friends riding in the back get hurt.'],
      controls: [[['left', 'right'], 'Steer'], [['up', 'down'], 'Speed up / slow down'], [['square'], 'Swing sword to the left'], [['ok'], 'Swing sword to the right']],
    },
    create: (opts, scene) => new BikeGame(opts, scene),
    quit: false,
  });
})();
