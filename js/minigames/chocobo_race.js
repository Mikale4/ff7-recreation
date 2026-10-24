// Chocobo racing at the Gold Saucer's Chocobo Square: six chocobos, stamina, Auto / Manual riding.
//   Manual (SELECT toggles; races start in Auto like FF7): Left/Right steer, □ speed up, ○ sprint,
//   ✕ slow down, hold R1+R2 to slowly refill stamina (the FF7 "stamina trick").
//   Stats follow the Chocobo breeding FAQ: Dash (sprint), Run, Accel, Stamina, Co-op, Intelligence.
//   opts: { forced (Corel Prison race: Esther's chocobos, retried until won), chocobo: { name, speed, stamina,
//           color, dash?, run?, accel?, coop?, intel? }, rank | class: 'C'|'B'|'A'|'S', course: 'short'|'long',
//           joe (TEIOH rides against you), jockey }
//   Result { won, place, time (s), score (7 - place), chocobo }
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, MG = FF7.minigames, ui = MG.ui;
  const W = FF7.W, H = FF7.H;
  const K = 0.000165;              // stat -> metres per frame
  const LANES = 6, LANE_W = 1.9;
  // Esther's chocobos for the Corel Prison race (one better bird after every loss)
  const ESTHER = [
    { name: 'Teioh?', dash: 3000, run: 2200, accel: 50, coop: 50, intel: 50, stamina: 3200 },
    { name: 'Cool Runner', dash: 3200, run: 2500, accel: 50, coop: 60, intel: 60, stamina: 3400 },
    { name: 'Wild Wind', dash: 3700, run: 3000, accel: 50, coop: 80, intel: 80, stamina: 4000 },
    { name: 'Bolt Bird', dash: 4500, run: 3500, accel: 50, coop: 100, intel: 100, stamina: 6000 },
  ];
  ESTHER[0].name = 'Esther’s Chocobo';
  const CLASS = { C: { dash: 2500, run: 1800, stam: 2600 }, B: { dash: 3000, run: 2200, stam: 3100 }, A: { dash: 3600, run: 2700, stam: 3800 }, S: { dash: 4300, run: 3300, stam: 4800 } };
  const NAMES = ['Brave Heart', 'Sandstorm', 'Kweh Kweh', 'Gold Rush', 'Dune Dasher', 'Spark', 'Mighty Wing', 'Cactuar Kid', 'Lucky Seven', 'Red Comet', 'Stardust', 'Big Bird'];
  const JOCKEYS = ['#d04040', '#4060d0', '#40a050', '#d0a030', '#a040c0', '#e07030'];
  const COLORS = { yellow: ['#f4d040', '#e0a820', '#f09030'], blue: ['#4a78d8', '#3050a8', '#e0c040'], green: ['#50b050', '#308030', '#f0c040'], black: ['#303038', '#202028', '#e0c040'], gold: ['#f8e070', '#e0b030', '#f0f0f0'], white: ['#f0f0f0', '#c8c8d0', '#f0a040'], red: ['#d05050', '#a03030', '#f0c040'], pink: ['#f090b0', '#d06080', '#f0c040'] };

  // ------------------------------------------------------------------ track
  function sectionsFor(course) {
    // [name, from, to]
    return course === 'long'
      ? [['stadium', 0, 170], ['tunnel', 170, 330], ['outdoor', 330, 760], ['water', 760, 1120], ['outdoor', 1120, 1380], ['space', 1380, 1640], ['tunnel', 1640, 1800], ['stadium', 1800, 2100]]
      : [['stadium', 0, 170], ['tunnel', 170, 330], ['outdoor', 330, 780], ['space', 780, 1100], ['tunnel', 1100, 1250], ['stadium', 1250, 1520]];
  }
  const SEC_COL = { stadium: ['#b88a58', '#a87c4c'], tunnel: ['#8a7058', '#7a6450'], outdoor: ['#c09a60', '#b08c54'], water: ['#5a90c0', '#4a80b0'], space: ['#3a2a6a', '#2e2058'] };
  function buildTrack(course) {
    const segs = course === 'long'
      ? [{ len: 170, turn: 0, w: 13 }, { len: 160, turn: 1.2 }, { len: 180, turn: -0.9 }, { len: 250, turn: 1.5 }, { len: 360, turn: -1.3, dy: -4 }, { len: 260, turn: 1.8, dy: 4 }, { len: 260, turn: -1.4 }, { len: 160, turn: 1.0 }, { len: 300, turn: 0 }]
      : [{ len: 170, turn: 0, w: 13 }, { len: 160, turn: 1.2 }, { len: 200, turn: -1.1 }, { len: 250, turn: 1.6, dy: -3 }, { len: 320, turn: -1.5, dy: 3 }, { len: 150, turn: 0.9 }, { len: 270, turn: 0 }];
    const path = new MG.Path(segs, { w: 13, step: 1 });
    const secs = sectionsFor(course);
    const secAt = (s) => { for (const q of secs) if (s >= q[1] && s < q[2]) return q[0]; return 'stadium'; };
    const L = path.length;
    const rnd = MG.rng('chocobo-square-' + course);
    const mesh = MG.mesh(mb => {
      path.strip(mb, 0, L, -6.5, 6.5, (s, f, i) => { const c = SEC_COL[secAt(s)]; return (Math.floor(i / 5) % 2) ? c[0] : c[1]; }, { stride: 2, nu: 6 });
      // lane lines
      for (let k = 1; k < LANES; k++) { const u = -6.5 + k * 13 / LANES; path.strip(mb, 0, L, u - 0.04, u + 0.04, (s) => secAt(s) === 'space' ? '#a080ff' : '#e8dcc0', { stride: 4, lift: 0.01 }); }
      // finish + start lines
      [[20, '#ffffff'], [L - 30, '#202020']].forEach(([s0, c]) => { for (let k = 0; k < 8; k++) path.strip(mb, s0, s0 + 1.2, -6.5 + k * 13 / 8, -6.5 + (k + 1) * 13 / 8, (k % 2) ? c : '#f0f0f0', { lift: 0.02 }); });
      // side rails / walls per section
      const railCol = (s) => { const q = secAt(s); return q === 'space' ? '#8060e0' : q === 'tunnel' ? '#5a4a3a' : '#f4f4f4'; };
      path.wall(mb, 0, L, 6.8, 0, 1.0, railCol, { stride: 2 });
      path.wall(mb, 0, L, -6.8, 0, 1.0, railCol, { stride: 2, facePlus: true });
      path.wall(mb, 0, L, 6.8, 0, 1.0, railCol, { stride: 2, facePlus: true });
      path.wall(mb, 0, L, -6.8, 0, 1.0, railCol, { stride: 2 });
      // outside ground
      path.strip(mb, 0, L, -70, -6.8, (s) => { const q = secAt(s); return q === 'space' ? '#141028' : q === 'water' ? '#3a6aa0' : q === 'outdoor' ? '#9a7a48' : '#6a5a48'; }, { stride: 6, lift: -0.05 });
      path.strip(mb, 0, L, 6.8, 70, (s) => { const q = secAt(s); return q === 'space' ? '#141028' : q === 'water' ? '#3a6aa0' : q === 'outdoor' ? '#9a7a48' : '#6a5a48'; }, { stride: 6, lift: -0.05 });
      for (const [name, s0, s1] of secs) {
        if (name === 'tunnel') {
          path.wall(mb, s0, s1, 7.6, 0, 7, (s, i) => (i >> 2) % 2 ? '#6a5a4a' : '#5a4a3c', { stride: 2 });
          path.wall(mb, s0, s1, -7.6, 0, 7, (s, i) => (i >> 2) % 2 ? '#6a5a4a' : '#5a4a3c', { stride: 2, facePlus: true });
          path.strip(mb, s0, s1, -7.6, 7.6, '#3a3028', { stride: 2, lift: 7, flip: true });
          for (let s = s0 + 5; s < s1; s += 12) { const q = path.pos(s, 0, 6.8); mb.box(q[0], q[1], q[2], 1.5, 0.12, 0.6, '#fff0c0'); }
        } else if (name === 'stadium') {
          [-1, 1].forEach(sd => {
            for (let s = s0; s < s1; s += 10) {
              for (let row = 0; row < 5; row++) {
                const q = path.pos(s, sd * (9 + row * 1.6), 0.4 + row * 1.1), a = path.at(s);
                mb.push(); mb.translate(q[0], q[1], q[2]); mb.rotate(0, a.yaw, 0);
                mb.box(0, -0.4, 0, 1.6, 1.1 + row * 0.1, 10.2, row % 2 ? '#8a8aa0' : '#7a7a90');
                for (let k = 0; k < 7; k++) if (rnd() < 0.8) mb.box((rnd() - 0.5) * 0.5, 0.35, -4.5 + k * 1.4 + rnd() * 0.3, 0.35, 0.5, 0.35, JOCKEYS[Math.floor(rnd() * 6)]);
                mb.pop();
              }
            }
          });
        } else if (name === 'outdoor') {
          for (let s = s0; s < s1; s += 9) [-1, 1].forEach(sd => {
            if (rnd() < 0.4) return;
            const q = path.pos(s, sd * (12 + rnd() * 25), 0);
            mb.push(); mb.translate(q[0], q[1], q[2]); mb.rotate(0, rnd() * 6, 0);
            if (rnd() < 0.6) mb.prism(0, 0, 0, 2 + rnd() * 4, 1 + rnd() * 2, 3 + rnd() * 9, 6, U.mix('#a07040', '#c09060', rnd()));
            else { mb.prism(0, 0, 0, 0.25, 0.2, 2.2, 6, '#4a8a3a'); mb.prism(0.5, 1.0, 0, 0.15, 0.12, 0.9, 5, '#4a8a3a'); }
            mb.pop();
          });
        } else if (name === 'water') {
          path.strip(mb, s0, s1, -6.5, 6.5, '#78b8e8', { stride: 3, lift: 0.08 });
          for (let s = s0; s < s1; s += 14) [-1, 1].forEach(sd => { const q = path.pos(s, sd * (10 + rnd() * 20), 0); mb.sphere(q[0], q[1], q[2], 1.5 + rnd() * 2, 0.8, 1.5 + rnd() * 2, '#708090', 6, 4, false); });
        }
      }
    });
    // space: stars + planets (unlit)
    const spaceSec = secs.find(q => q[0] === 'space');
    const stars = MG.mesh(mb => {
      for (let i = 0; i < 260; i++) {
        const s = U.lerp(spaceSec[1] - 40, spaceSec[2] + 40, rnd()), q = path.pos(s, (rnd() - 0.5) * 160, 2 + rnd() * 60);
        const r = 0.12 + rnd() * 0.25; mb.box(q[0], q[1], q[2], r, r, r, rnd() < 0.8 ? '#ffffff' : '#ffe090');
      }
      [[0.3, 50, '#e07040', 9], [0.7, -60, '#6090e0', 12], [0.5, 30, '#c0a0ff', 5]].forEach(([f, u, c, r]) => { const q = path.pos(U.lerp(spaceSec[1], spaceSec[2], f), u, 30); mb.sphere(q[0], q[1], q[2], r, r, r, c, 12, 8, true); });
    }, { unlit: true });
    const banner = MG.mesh(mb => {
      [20, L - 30].forEach(s0 => { const a = path.at(s0), p1 = path.pos(s0, -7.2, 0), p2 = path.pos(s0, 7.2, 0);
        mb.push(); mb.translate(p1[0], 0, p1[2]); mb.box(0, 3, 0, 0.3, 6, 0.3, '#d0d0d0'); mb.pop();
        mb.push(); mb.translate(p2[0], 0, p2[2]); mb.box(0, 3, 0, 0.3, 6, 0.3, '#d0d0d0'); mb.pop();
        const c = path.pos(s0, 0, 5.6); mb.push(); mb.translate(c[0], c[1], c[2]); mb.rotate(0, a.yaw, 0); mb.box(0, 0, 0, 14.4, 1.0, 0.2, '#c02020'); mb.box(0, 0, 0.12, 6, 0.6, 0.05, '#ffe060'); mb.pop(); });
    });
    return { path, mesh, stars, banner, secs, secAt, L, finish: L - 30 };
  }

  // ------------------------------------------------------------------ racers
  function statsFor(rank, rnd, i) {
    const c = CLASS[rank] || CLASS.B, v = () => U.lerp(0.88, 1.1, rnd());
    return { name: NAMES[(i * 5 + Math.floor(rnd() * 12)) % NAMES.length], dash: c.dash * v(), run: c.run * v(), accel: 40 + rnd() * 40, coop: 50, intel: 20 + rnd() * 60, stamina: c.stam * v() };
  }
  function fromOpts(ch) {
    // a stabled bird's raw stats (js/maps/c12/part1.js: dash, runSp = its cruising Run, stam); older callers pass the
    // on-screen ones: speed (km/h = dash / 34) and stamina (display = stamina / 10)
    const dash = ch.dash || (ch.speed ? ch.speed * 34 : 3000);
    const stamina = ch.stam || (ch.stamina ? (ch.stamina < 1000 ? ch.stamina * 10 : ch.stamina) : 3200);
    return { name: ch.name || 'Chocobo', dash, run: ch.runSp || ch.run || dash * 0.75, accel: ch.accel || 50, coop: ch.coop != null ? ch.coop : 60, intel: ch.intel != null ? ch.intel : 60, stamina,
      color: ch.color, black: ch.color === 'black' || ch.color === 'gold', river: ch.color === 'blue', mountain: ch.color === 'green' };
  }

  // Sitting pose for the jockeys
  function jockeyPose(m, whip) {
    const b = (n) => m.b(n);
    b('thighL').rot[0] = -1.2; b('thighR').rot[0] = -1.2; b('thighL').rot[2] = 0.55; b('thighR').rot[2] = -0.55;
    b('shinL').rot[0] = 1.3; b('shinR').rot[0] = 1.3;
    b('torso').rot[0] = 0.35; b('head').rot[0] = -0.35;
    b('armL').rot[0] = -0.9; b('foreL').rot[0] = -0.6; b('armR').rot[0] = -0.9; b('foreR').rot[0] = -0.6;
    if (whip) { b('armR').rot[0] = -2.2 + Math.sin(FF7.frame * 0.6) * 0.5; }
  }

  class RaceGame {
    constructor(opts, scene) {
      this.opts = opts; this.scene = scene;
      this.forced = !!opts.forced;
      this.rank = String(opts.rank || opts['class'] || 'B').toUpperCase();
      this.courseName = opts.course === 'long' ? 'long' : 'short';
      this.track = buildTrack(this.courseName);
      this.t = 0; this.done = false; this.cam = new MG.Cam(); this.fx = new MG.Particles();
      const rnd = MG.rng(Math.floor(Math.random() * 1e9));
      // the player's bird
      let mine;
      if (this.forced) {
        const st = FF7.state, k = 'mg_esther_try';
        const n = st && st.vars ? (st.vars[k] || 0) : (scene ? scene.tries - 1 : 0);
        mine = Object.assign({}, ESTHER[Math.min(ESTHER.length - 1, n)]);
        this.estherTry = n;
      } else mine = opts.chocobo ? fromOpts(opts.chocobo) : Object.assign({ name: 'Chocobo' }, statsFor(this.rank, rnd, 0), { coop: 60, intel: 60 });
      mine.player = true; mine.color = mine.color || 'yellow';
      const racers = [mine];
      const joe = opts.joe != null ? !!opts.joe : this.rank === 'S' ? rnd() < 0.8 : this.rank === 'A' ? rnd() < 0.4 : this.rank === 'B' && !this.forced ? rnd() < 0.1 : false;
      for (let i = 1; i < 6; i++) {
        if (joe && i === 5) racers.push({ name: 'TEIOH', jockey: 'Joe', dash: mine.dash * 1.1, run: mine.run * 1.1, accel: 60, coop: 100, intel: 45, stamina: mine.stamina * 1.25, color: 'black', black: true, joe: true });
        else racers.push(Object.assign(statsFor(this.forced ? 'B' : this.rank, rnd, i), { color: ['blue', 'green', 'red', 'pink', 'white', 'yellow'][i % 6] }));
      }
      // lanes: random order, player in a middle lane
      const lanes = U.shuffle([0, 1, 2, 3, 4, 5]);
      this.birds = racers.map((r, i) => {
        const lane = lanes[i];
        const b = Object.assign({}, r, {
          id: i, lane, u: -6.5 + (lane + 0.5) * LANE_W * 13 / (LANES * LANE_W), s: 8, v: 0, sta: r.stamina, maxSta: r.stamina,
          runV: r.run * K, dashV: r.dash * K, cmd: 'run', tired: false, finished: 0, place: 0, uv: 0,
          plan: { sprintEarly: 60 + rnd() * (240 - r.intel * 1.5), kick: 0.7 + rnd() * 0.2 + (r.intel / 100) * 0.08 }, ph: rnd() * 6,
        });
        const cols = COLORS[b.color] || (typeof b.color === 'string' && b.color[0] === '#' ? [b.color, U.shade(b.color, -0.25), '#f0a040'] : COLORS.yellow);
        b.model = MG.char({ rig: 'chocobo', c1: cols[0], c2: cols[1], c3: cols[2] });
        b.model.scale = 1.35; b.model.play('run', { speed: 1 });
        b.jockeyM = b.player ? MG.char(opts.jockey || 'cloud') : MG.char({ base: 'man', top: JOCKEYS[i % 6], sleeve: JOCKEYS[i % 6], hair: '#403020', hairStyle: 'short' });
        b.jockeyM.scale = 1.05;
        return b;
      });
      this.me = this.birds[0];
      this.manual = false;
      this.order = this.birds.slice();
      this.finishCount = 0;
      this.ending = 0;
      this.camPos = null;
    }
    get go() { return this.t >= MG.READY; }
    slowFactor(b) {
      const sec = this.track.secAt(b.s);
      if (b.black) return 1;                        // (Black and Gold: neither slows them)
      return sec === 'space' ? (b.mountain ? 1 : 0.8) : sec === 'water' ? (b.river ? 1 : 0.85) : 1;
    }
    // AI decides a command (also used for the player in Auto)
    ai(b) {
      const L = this.track.finish, frac = b.s / L, staF = b.sta / b.maxSta;
      if (b.tired) return 'slow';
      if (b.joe) return frac < 0.25 || (frac > 0.75 && staF > 0.1) ? 'sprint' : staF < 0.3 ? 'slow' : 'up';
      if (this.t - MG.READY < b.plan.sprintEarly && !b.player) return 'sprint';             // the lame early sprint
      if (frac > b.plan.kick && staF > 0.08) return 'sprint';
      const need = (1 - frac) * 0.9;                          // save stamina for the finish
      if (staF > need + 0.25) return 'up';
      if (staF < need * 0.5) return 'slow';
      return 'run';
    }
    update(I) {
      this.t++;
      this.fx.update();
      const go = this.go;
      if (go && I.pressed('select')) { this.manual = !this.manual; MG.sfx('cursor'); }
      for (const b of this.birds) {
        if (!go) break;
        let cmd, steer = 0;
        const refill = b.player && this.manual && I.held('r1') && I.held('r2');
        if (b.player && this.manual && !b.finished) {
          cmd = I.held('ok') ? 'sprint' : I.held('square') ? 'up' : I.held('cancel') ? 'slow' : 'run';
          steer = I.dir().x;
          if (Math.random() * 100 > 55 + b.coop * 0.45 && this.t % 30 < 6) cmd = 'run';     // low co-operation: ignores you now and then
        } else cmd = b.finished ? 'slow' : this.ai(b);
        if (b.tired) cmd = 'slow';
        b.cmd = cmd;
        // target speed
        const span = b.dashV - b.runV;
        let tv = cmd === 'sprint' ? b.dashV : cmd === 'up' ? b.runV + span * 0.55 : cmd === 'slow' ? b.runV * 0.72 : b.runV;
        if (b.tired) tv = b.runV * 0.55;
        tv *= this.slowFactor(b);
        const acc = 0.0025 + b.accel * 0.00005;
        b.v += U.clamp(tv - b.v, -acc * 2, acc);
        // stamina
        const over = (b.v - b.runV) / Math.max(0.01, span);
        if (over > 0.02) b.sta -= b.maxSta / 420 * over * (cmd === 'sprint' ? 1.25 : 0.8);
        else b.sta += b.maxSta / 1500 * (b.v < b.runV * 0.8 ? 1.6 : 0.8);
        if (refill) b.sta += b.maxSta / 700;
        b.sta = U.clamp(b.sta, 0, b.maxSta);
        if (b.sta <= 0) b.tired = true; else if (b.tired && b.sta > b.maxSta * 0.25) b.tired = false;
        // steering / lanes
        if (!(b.player && this.manual)) steer = this.aiSteer(b);
        b.uv += steer * 0.02; b.uv *= 0.85; b.u += b.uv;
        b.u = U.clamp(b.u, -5.9, 5.9);
        // blocking: slow behind another bird
        for (const o of this.birds) if (o !== b && Math.abs(o.u - b.u) < 1.2 && o.s > b.s && o.s - b.s < 2.2) { b.v = Math.min(b.v, o.v * 0.98); if (Math.abs(o.u - b.u) < 0.9) b.u += (b.u >= o.u ? 0.05 : -0.05); }
        // progress: inside of a curve is shorter
        const a1 = this.track.path.at(b.s), a2 = this.track.path.at(b.s + 1), curv = a2.yaw - a1.yaw;
        const ds = b.v / Math.max(0.6, 1 - curv * b.u * 1.0);
        b.s += ds;
        b.model.speed = 0.6 + b.v * 1.6;
        if (!b.finished && b.s >= this.track.finish) {
          b.finished = this.t; b.place = ++this.finishCount;
          if (b.player) { this.myTime = (this.t - MG.READY) / 60; MG.sfx(b.place === 1 ? 'item' : 'cancel'); this.ending = 1; }
        }
        if (b.s > this.track.L - 3) { b.s = this.track.L - 3; b.v = 0; }
        if (this.t % 6 === 0 && b.v > 0.3) this.fx.add(this.track.path.pos(b.s - 0.8, b.u, 0.1), [(Math.random() - 0.5) * 0.04, 0.03, (Math.random() - 0.5) * 0.04], 20, this.track.secAt(b.s) === 'water' ? '#d0f0ff' : '#c0a070', 0.3, 0.002, 'alpha');
      }
      // order
      this.order = this.birds.slice().sort((a, b) => (a.finished && b.finished) ? a.place - b.place : a.finished ? -1 : b.finished ? 1 : b.s - a.s);
      if (this.ending && ++this.ending > 150) this.complete();
      else if (!this.ending && go && this.t - MG.READY > 60 * 240) { this.me.place = 6; this.myTime = 240; this.complete(); }   // safety net
    }
    aiSteer(b) {
      // move out from behind a slower bird, else drift toward the inside of the next bend
      for (const o of this.birds) {
        if (o === b) continue;
        if (Math.abs(o.u - b.u) < 1.4 && o.s > b.s && o.s - b.s < 4 && o.v <= b.v + 0.02) {
          const left = b.u - 2, right = b.u + 2;
          const free = (u) => u > -5.8 && u < 5.8 && !this.birds.some(x => x !== b && Math.abs(x.u - u) < 1.2 && Math.abs(x.s - b.s) < 3);
          return free(left) ? -1 : free(right) ? 1 : 0;
        }
      }
      const a1 = this.track.path.at(b.s + 20), a0 = this.track.path.at(b.s);
      const turn = a1.yaw - a0.yaw;
      const want = U.clamp(-turn * 30, -4.5, 4.5) + Math.sin(b.ph) * 1.2;
      return Math.abs(want - b.u) > 0.4 ? Math.sign(want - b.u) * 0.5 : 0;
    }
    complete() {
      if (this.done) return;
      const me = this.me;
      if (!me.place) { me.place = 1 + this.birds.filter(b => b !== me && (b.finished || b.s > me.s)).length; }
      const won = me.place === 1;
      this.result = { won, place: me.place, time: Math.round((this.myTime || 0) * 100) / 100, score: 7 - me.place, chocobo: me.name, course: this.courseName };
      if (this.forced && FF7.state && FF7.state.vars) FF7.state.vars.mg_esther_try = won ? 0 : Math.min(ESTHER.length - 1, (this.estherTry || 0) + 1);
      this.done = true;
    }
    idle() { this.fx.update(); }
    bot() {
      if (!this.go) return [];
      const out = [], me = this.me;
      if (!this.manual) { if (this.t === MG.READY + 2) out.push('select'); return out; }
      const frac = me.s / this.track.finish, staF = me.sta / me.maxSta;
      if (frac > 0.72 && staF > 0.05) out.push('ok');
      else if (staF > 0.45) out.push('square');
      out.push('r1', 'r2');
      const st = this.aiSteer(me);
      if (st < 0) out.push('left'); else if (st > 0) out.push('right');
      return out;
    }
    debugLog() { return this.order.map(b => `${b.player ? '*' : ''}${b.name.slice(0, 6)}:${b.s.toFixed(0)}${b.tired ? 'T' : ''}`).join(' '); }

    // ---------------------------------------------------------------- render
    render() {
      const T = this.track, p = T.path, me = this.me;
      const sec = T.secAt(me.s);
      if (sec === 'space') MG.sky('#05040e', '#1a1040', '#0c0820'); else MG.sky('#3a78c8', '#f0d8a8', '#90b8e0');
      const a = p.at(me.s);
      const back = p.pos(Math.max(0, me.s - 7), me.u * 0.7, 3.6);
      if (me.s < 7) { back[0] -= Math.sin(a.yaw) * (7 - me.s); back[2] -= Math.cos(a.yaw) * (7 - me.s); }
      if (!this.camPos) this.camPos = back.slice();
      for (let k = 0; k < 3; k++) this.camPos[k] = U.lerp(this.camPos[k], back[k], 0.2);
      this.cam.set(this.camPos, p.pos(me.s + 8, me.u * 0.8, 1.2), 55, 0.3, 400);
      GL.begin({ clear: [0, 0, 0, 0], fog: sec === 'space' ? { color: [0.03, 0.02, 0.08], near: 60, far: 200 } : { color: [0.85, 0.82, 0.76], near: 80, far: 260 }, light: { dir: [-0.4, -0.8, -0.3], color: [0.7, 0.68, 0.62], ambient: [0.46, 0.46, 0.5] } });
      this.cam.apply();
      GL.draw(T.mesh, null);
      GL.draw(T.banner, null);
      const sp = T.secs.find(q => q[0] === 'space');
      if (sp && me.s > sp[1] - 120 && me.s < sp[2] + 60) GL.draw(T.stars, null);
      for (const b of this.birds) {
        if (Math.abs(b.s - me.s) > 120) continue;
        const pos = p.pos(b.s, b.u, 0), yaw = p.at(b.s).yaw + b.uv * 1.5;
        MG.shadow(pos[0], pos[1], pos[2], 0.7, 0.35);
        b.model.update(b.finished ? 0.5 : 1);
        MG.drawModel(b.model, pos, yaw, 0, -b.uv * 2);
        // jockey on the back
        const sp = MG.seat(b.model, 'saddle', pos, yaw, [0, 0.8, -0.05]);
        b.jockeyM.onPose = (m) => jockeyPose(m, b.cmd === 'sprint');
        b.jockeyM.update();
        const hipY = (b.jockeyM.bones.hips ? b.jockeyM.bones.hips.offset[1] : 0.41) * b.jockeyM.scale;
        MG.drawModel(b.jockeyM, [sp[0], sp[1] - hipY + Math.abs(Math.sin(b.model.t * 0.3)) * 0.05, sp[2]], yaw, 0, -b.uv * 2);
      }
      this.fx.draw();
      GL.end();
      this.renderHUD();
    }
    renderHUD() {
      const me = this.me;
      // stamina (left, vertical)
      R.window(10, 90, 44, 220);
      R.text('ST', 32, 96, { size: 11, align: 'center', color: R.COL.cyan });
      const f = me.sta / me.maxSta, bh = 180;
      R.ctx.fillStyle = '#202028'; R.ctx.fillRect(24, 116, 16, bh);
      R.ctx.fillStyle = me.tired ? (this.t % 20 < 10 ? '#803030' : '#c04040') : '#e03030'; R.ctx.fillRect(24, 116 + bh * (1 - f), 16, bh * f);
      // order list (right)
      R.window(W - 170, 60, 160, 6 * 22 + 16);
      this.order.forEach((b, i) => {
        const y = 68 + i * 22;
        R.text(`${i + 1}`, W - 158, y, { size: 13, color: R.COL.cyan });
        R.text(b.name, W - 140, y, { size: 13, color: b.player ? '#ffe060' : b.joe ? '#c080ff' : R.COL.white });
      });
      // time + course
      R.window(W / 2 - 80, 8, 160, 34);
      R.text(MG.fmtTime(Math.max(0, (me.finished || this.t) - MG.READY)), W / 2, 14, { size: 17, align: 'center' });
      // mini map (progress)
      R.window(W - 170, 216, 160, 36);
      R.ctx.fillStyle = '#404050'; R.ctx.fillRect(W - 158, 232, 136, 4);
      this.birds.forEach(b => { R.ctx.fillStyle = b.player ? '#ffe060' : b.joe ? '#202020' : '#e0e0e0'; R.ctx.fillRect(W - 158 + 136 * U.clamp(b.s / this.track.finish, 0, 1) - 2, b.player ? 226 : 229, 4, b.player ? 14 : 9); });
      // mode box (bottom)
      R.window(W / 2 - 110, H - 50, 220, 38);
      R.text(this.manual ? 'MANUAL' : 'AUTO', W / 2 - 40, H - 42, { size: 16, align: 'center', color: this.manual ? '#ffe060' : R.COL.white });
      ui.keys(['select'], W / 2 + 30, H - 31, 14);
      if (this.manual) {
        const c = me.cmd;
        R.text(c === 'sprint' ? 'DASH!' : c === 'up' ? 'SPEED UP' : c === 'slow' ? 'SLOW' : '', W / 2, H - 70, { size: 14, align: 'center', color: '#ffe060' });
      }
      ui.readyGo(this.t, 180);
      if (me.finished) ui.big(me.place === 1 ? 'WIN!' : `${me.place}${['st', 'nd', 'rd'][me.place - 1] || 'th'}`, 170, me.place === 1 ? '#ffe060' : '#c0c0ff', 48);
    }
    resultTitle(r) { return r.won ? 'YOU WIN!' : `${r.place}${['st', 'nd', 'rd'][r.place - 1] || 'th'} PLACE`; }
    resultRows(r) {
      const rows = [['Chocobo', r.chocobo], ['Place', r.place], ['Time', `${r.time.toFixed(2)}s`]];
      if (this.forced && !r.won) rows.push(['Esther', 'One more time!', '#ffe060']);
      return rows;
    }
  }

  MG.register('chocobo_race', {
    title: 'Chocobo Racing',
    music: () => 'racing',
    help: (o) => ({
      title: o.forced ? 'CHOCOBO RACE  (B CLASS)' : `CHOCOBO RACE  (${String(o.rank || o['class'] || 'B').toUpperCase()} CLASS)`,
      lines: ['Your chocobo races on its own in AUTO. Press SELECT to take the reins in MANUAL.',
        'Speed eats stamina, and a worn-out bird slows to a crawl. Save some for the dash to the finish line!'],
      controls: [[['select'], 'Auto / Manual'], [['left', 'right'], 'Steer'], [['square'], 'Speed up'], [['ok'], 'Sprint'], [['cancel'], 'Slow down'], [['r1', '+', 'r2'], 'Hold to recover stamina']],
    }),
    create: (opts, scene) => new RaceGame(opts, scene),
    retry: (opts) => opts.forced ? 'auto' : (opts.retry ? 'ask' : null),
  });
})();
